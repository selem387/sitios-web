<?php
/**
 * Plugin Name: IAprop Acceso del dueño
 * Description: Cuenta del dueño de cada sitio (rol iaprop_dueno), entrada sin contraseña en /acceso (código al correo o Google)
 *              y wp-admin simplificado: Páginas y Entradas con el editor de bloques, Medios y "Datos del negocio" (logo y WhatsApp).
 * Version: 0.1.0
 * License: GPL-2.0-or-later
 *
 * Va en wp-content/mu-plugins/ junto a iaprop-generador.php (usa su autenticación X-IAprop-Key).
 * El correo con el código lo manda el backend (POST {api}/acceso/v1/enviar-codigo) y el login con Google
 * se resuelve en el backend ({api}/acceso/google/wp), que regresa a /acceso con un pase firmado con la misma clave.
 * Sin marca de la empresa en nada de lo que ve el dueño.
 */

defined( 'ABSPATH' ) || exit;

const IAPROP_ROL = 'iaprop_dueno';

function iaprop_acc_clave() { return function_exists( 'iaprop_gen_clave' ) ? iaprop_gen_clave() : ''; }
function iaprop_acc_api() { return rtrim( (string) get_site_option( 'iaprop_api_url', '' ), '/' ); }
function iaprop_acc_es_dueno( $u = null ) {
	$u = $u ?: wp_get_current_user();
	return $u && $u->exists() && in_array( IAPROP_ROL, (array) $u->roles, true ) && ! is_super_admin( $u->ID );
}
function iaprop_acc_b64( $s ) { return rtrim( strtr( base64_encode( $s ), '+/', '-_' ), '=' ); }
function iaprop_acc_deb64( $s ) { return base64_decode( strtr( $s, '-_', '+/' ) . str_repeat( '=', ( 4 - strlen( $s ) % 4 ) % 4 ) ); }

/** Rol del dueño en el sitio actual: edita páginas y entradas (no borra páginas), sube medios. Sin ajustes, temas, plugins ni usuarios. */
function iaprop_acc_rol() {
	$caps = array(
		'read' => true, 'upload_files' => true,
		'edit_pages' => true, 'edit_others_pages' => true, 'edit_published_pages' => true, 'publish_pages' => true, 'edit_private_pages' => true, 'read_private_pages' => true,
		'edit_posts' => true, 'edit_others_posts' => true, 'edit_published_posts' => true, 'publish_posts' => true, 'delete_posts' => true, 'delete_published_posts' => true, 'manage_categories' => true,
	);
	$rol = get_role( IAPROP_ROL );
	if ( ! $rol ) { add_role( IAPROP_ROL, 'Dueño', $caps ); return; }
	foreach ( $caps as $c => $v ) if ( ! $rol->has_cap( $c ) ) $rol->add_cap( $c, $v );
}

/* ------------------------------------------------------------------ */
/* REST (sitio principal): alta del dueño                              */
/* ------------------------------------------------------------------ */

add_action( 'rest_api_init', function () {
	if ( ! is_main_site() || ! function_exists( 'iaprop_gen_autorizado' ) ) return;
	register_rest_route( 'iaprop/v1', '/sitios/(?P<id>\d+)/dueno', array(
		'methods' => 'POST', 'permission_callback' => 'iaprop_gen_autorizado', 'callback' => 'iaprop_acc_alta_dueno',
	) );
} );

/** POST /sitios/{id}/dueno {email, nombre?, api_url?, google?} → crea o reutiliza el usuario y lo deja como único dueño del sitio. */
function iaprop_acc_alta_dueno( WP_REST_Request $req ) {
	$blog_id = (int) $req['id'];
	$email   = strtolower( sanitize_email( (string) $req->get_param( 'email' ) ) );
	$nombre  = sanitize_text_field( (string) $req->get_param( 'nombre' ) );
	$giro    = sanitize_key( (string) $req->get_param( 'arquetipo' ) );
	if ( ! get_site( $blog_id ) ) return new WP_Error( 'iaprop_no_existe', 'sitio no existe', array( 'status' => 404 ) );
	if ( ! is_email( $email ) ) return new WP_Error( 'iaprop_email', 'correo inválido', array( 'status' => 400 ) );
	$api = esc_url_raw( (string) $req->get_param( 'api_url' ) );
	if ( $api ) update_site_option( 'iaprop_api_url', $api );
	update_site_option( 'iaprop_google', $req->get_param( 'google' ) ? 1 : 0 );

	$u = get_user_by( 'email', $email );
	if ( ! $u ) {
		$base  = sanitize_user( preg_replace( '/@.*/', '', $email ), true ) ?: 'dueno';
		$login = $base;
		for ( $n = 2; username_exists( $login ); $n++ ) $login = $base . $n;
		// Contraseña aleatoria que nadie conoce: el dueño entra con código o Google.
		$uid = wpmu_create_user( $login, wp_generate_password( 40, true, true ), $email );
		if ( ! $uid ) return new WP_Error( 'iaprop_usuario', 'no se pudo crear el usuario', array( 'status' => 500 ) );
		if ( $nombre ) wp_update_user( array( 'ID' => $uid, 'display_name' => $nombre, 'first_name' => $nombre ) );
		$u = get_user_by( 'id', $uid );
	}
	switch_to_blog( $blog_id );
	try {
		iaprop_acc_rol();
		// Solo un dueño por sitio: si cambió el correo, el anterior deja de tener acceso.
		$anterior = (int) get_option( 'iaprop_dueno_id' );
		if ( $anterior && $anterior !== (int) $u->ID && ! is_super_admin( $anterior ) ) remove_user_from_blog( $anterior, $blog_id );
		add_user_to_blog( $blog_id, $u->ID, IAPROP_ROL );
		update_option( 'iaprop_dueno_id', (int) $u->ID );
		update_option( 'iaprop_dueno_email', $email );
		if ( $giro ) update_option( 'iaprop_arquetipo', $giro );
		$acceso = home_url( '/acceso/' );
		$admin  = admin_url();
	} finally {
		restore_current_blog();
	}
	return array( 'ok' => true, 'user_id' => (int) $u->ID, 'email' => $email, 'acceso' => $acceso, 'admin' => $admin );
}

/* ------------------------------------------------------------------ */
/* Entrada sin contraseña: /acceso                                     */
/* ------------------------------------------------------------------ */

// wp-admin sin sesión manda a /acceso. wp-login.php sigue disponible para el equipo (super admin).
add_filter( 'login_url', function ( $url, $redirect ) {
	if ( is_main_site() || ! get_option( 'iaprop_dueno_email' ) ) return $url;
	return home_url( '/acceso/' );
}, 20, 2 );
add_filter( 'allow_password_reset', function ( $ok, $uid ) { return iaprop_acc_es_dueno( get_user_by( 'id', $uid ) ) ? false : $ok; }, 10, 2 );
add_filter( 'show_password_fields', function ( $mostrar, $u ) { return iaprop_acc_es_dueno( $u ) ? false : $mostrar; }, 10, 2 );
add_filter( 'wp_is_application_passwords_available_for_user', function ( $ok, $u ) { return iaprop_acc_es_dueno( $u ) ? false : $ok; }, 10, 2 );

function iaprop_acc_dueno_del_sitio() {
	$id = (int) get_option( 'iaprop_dueno_id' );
	$u  = $id ? get_user_by( 'id', $id ) : null;
	return ( $u && is_user_member_of_blog( $u->ID ) ) ? $u : null;
}

function iaprop_acc_limitar( $clave, $max ) {
	$ip = preg_replace( '/[^0-9a-f:.]/i', '', (string) ( $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '' ) );
	$k  = 'iap_lim_' . md5( $clave . '|' . strtok( $ip, ',' ) );
	$n  = (int) get_transient( $k );
	if ( $n >= $max ) return false;
	set_transient( $k, $n + 1, 10 * MINUTE_IN_SECONDS );
	return true;
}

function iaprop_acc_mandar_codigo( WP_User $u ) {
	$api = iaprop_acc_api();
	if ( ! $api ) return false;
	$codigo = (string) random_int( 100000, 999999 );
	set_transient( 'iap_cod_' . get_current_blog_id() . '_' . $u->ID, array( 'h' => wp_hash_password( $codigo ), 'i' => 0 ), 10 * MINUTE_IN_SECONDS );
	$r = wp_remote_post( $api . '/acceso/v1/enviar-codigo', array(
		'timeout' => 25,
		'headers' => array( 'content-type' => 'application/json', 'x-iaprop-key' => iaprop_acc_clave() ),
		'body'    => wp_json_encode( array( 'email' => $u->user_email, 'codigo' => $codigo, 'negocio' => get_bloginfo( 'name' ) ) ),
	) );
	return ! is_wp_error( $r ) && 200 === (int) wp_remote_retrieve_response_code( $r );
}

function iaprop_acc_validar_codigo( WP_User $u, $codigo ) {
	$k = 'iap_cod_' . get_current_blog_id() . '_' . $u->ID;
	$t = get_transient( $k );
	$c = preg_replace( '/\D/', '', (string) $codigo );
	if ( ! $t || $t['i'] >= 5 || strlen( $c ) !== 6 ) return false;
	if ( ! wp_check_password( $c, $t['h'] ) ) { $t['i']++; set_transient( $k, $t, 10 * MINUTE_IN_SECONDS ); return false; }
	delete_transient( $k );
	return true;
}

function iaprop_acc_entrar( WP_User $u, $metodo ) {
	wp_set_current_user( $u->ID );
	wp_set_auth_cookie( $u->ID, true, is_ssl() );
	do_action( 'wp_login', $u->user_login, $u );
	update_user_meta( $u->ID, 'iaprop_ultimo_acceso', array( 'cuando' => gmdate( 'c' ), 'metodo' => $metodo ) );
	wp_safe_redirect( admin_url() );
	exit;
}

/** Pase del login con Google: base64url(json{email, blog, exp, jti}).hmac */
function iaprop_acc_canjear_pase( $pase ) {
	$partes = explode( '.', (string) $pase );
	if ( count( $partes ) !== 2 ) return null;
	$clave = iaprop_acc_clave();
	if ( strlen( $clave ) < 24 || ! hash_equals( hash_hmac( 'sha256', $partes[0], $clave ), $partes[1] ) ) return null;
	$d = json_decode( iaprop_acc_deb64( $partes[0] ), true );
	if ( ! is_array( $d ) || (int) ( $d['exp'] ?? 0 ) < time() || (int) ( $d['blog'] ?? 0 ) !== get_current_blog_id() ) return null;
	$jti = 'iap_jti_' . md5( (string) ( $d['jti'] ?? '' ) );
	if ( get_site_transient( $jti ) ) return null;
	set_site_transient( $jti, 1, 15 * MINUTE_IN_SECONDS );
	$u = iaprop_acc_dueno_del_sitio();
	return ( $u && strtolower( $u->user_email ) === strtolower( (string) ( $d['email'] ?? '' ) ) ) ? $u : null;
}

function iaprop_acc_url_google() {
	if ( ! get_site_option( 'iaprop_google' ) || ! iaprop_acc_api() ) return '';
	$u = iaprop_acc_dueno_del_sitio();
	if ( ! $u ) return '';
	$d = iaprop_acc_b64( wp_json_encode( array( 'url' => home_url( '/acceso/' ), 'email' => $u->user_email, 'blog' => get_current_blog_id(), 'exp' => time() + 600 ) ) );
	return iaprop_acc_api() . '/acceso/google/wp?d=' . rawurlencode( $d ) . '&s=' . hash_hmac( 'sha256', $d, iaprop_acc_clave() );
}

add_action( 'parse_request', function () {
	$ruta = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );
	if ( 'acceso' !== $ruta || is_main_site() ) return;
	nocache_headers();
	header( 'X-Robots-Tag: noindex' );
	$dueno = iaprop_acc_dueno_del_sitio();
	if ( is_user_logged_in() && current_user_can( 'edit_pages' ) ) { wp_safe_redirect( admin_url() ); exit; }
	$paso = 'correo'; $msg = ''; $ok = false; $email = '';

	if ( isset( $_GET['pase'] ) ) {
		$u = iaprop_acc_canjear_pase( wp_unslash( $_GET['pase'] ) );
		if ( $u ) iaprop_acc_entrar( $u, 'google' );
		$msg = 'No se pudo entrar con Google. Pide un código a tu correo.';
	}
	if ( isset( $_GET['error'] ) ) $msg = sanitize_text_field( wp_unslash( $_GET['error'] ) );

	if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
		$email  = strtolower( sanitize_email( wp_unslash( $_POST['email'] ?? '' ) ) );
		$accion = sanitize_key( $_POST['accion'] ?? '' );
		$es     = $dueno && $email && strtolower( $dueno->user_email ) === $email;
		if ( ! wp_verify_nonce( $_POST['_n'] ?? '', 'iaprop_acceso' ) ) {
			$msg = 'La página caducó. Vuelve a intentarlo.';
		} elseif ( 'codigo' === $accion ) {
			if ( ! iaprop_acc_limitar( 'codigo', 6 ) ) { $msg = 'Ya pediste varios códigos. Espera unos minutos.'; }
			else {
				// Misma respuesta exista o no el correo, para no revelar quién administra el sitio.
				if ( $es && ! iaprop_acc_mandar_codigo( $dueno ) ) { $msg = 'No pudimos mandar el código en este momento. Inténtalo en unos minutos.'; }
				else { $paso = 'codigo'; $ok = true; $msg = 'Si ese correo administra esta página, ya te llegó un código.'; }
			}
		} elseif ( 'entrar' === $accion ) {
			$paso = 'codigo';
			if ( ! iaprop_acc_limitar( 'entrar', 20 ) ) { $msg = 'Demasiados intentos. Espera unos minutos.'; }
			elseif ( $es && iaprop_acc_validar_codigo( $dueno, wp_unslash( $_POST['codigo'] ?? '' ) ) ) { iaprop_acc_entrar( $dueno, 'codigo_correo' ); }
			else { $msg = 'El código no es correcto o ya venció. Pide uno nuevo.'; }
		}
	}
	iaprop_acc_pantalla( $paso, $email, $msg, $ok, $dueno );
	exit;
}, 0 );

function iaprop_acc_pantalla( $paso, $email, $msg, $ok, $dueno ) {
	$nombre = get_bloginfo( 'name' );
	$pista  = '';
	if ( $dueno ) { list( $a, $d ) = explode( '@', $dueno->user_email ) + array( '', '' ); $pista = substr( $a, 0, 2 ) . str_repeat( '•', max( 1, strlen( $a ) - 2 ) ) . '@' . $d; }
	$google = iaprop_acc_url_google();
	$n      = wp_create_nonce( 'iaprop_acceso' );
	header( 'Content-Type: text/html; charset=utf-8' );
	?><!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Administrar <?php echo esc_html( $nombre ); ?></title>
<style>
:root{--bg:#F6F5F2;--card:#fff;--fg:#1C1B19;--soft:#5F5B54;--bor:#E2DFD8;--p:#1F5F4A;--on:#fff;--ok:#1F7A4C;--bad:#B3261E;--foco:#2F6FDE}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1E1E1C;--fg:#F1EFEA;--soft:#B5B0A6;--bor:#34332F;--p:#5FC2A0;--on:#0E1F19;--ok:#6FD49E;--bad:#FF8A80}}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{max-width:420px;margin:8vh auto 0;padding:0 16px 60px}h1{font-size:24px;line-height:1.2}.sub{color:var(--soft);margin-top:8px}
label{display:block;font-weight:600;font-size:14px;margin:18px 0 6px}input{width:100%;font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--bor);border-radius:10px;padding:12px;min-height:48px}
button,.g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font:inherit;font-weight:650;border-radius:999px;min-height:48px;margin-top:14px;cursor:pointer;text-decoration:none}
button{background:var(--p);color:var(--on);border:0}.sec{background:transparent;color:var(--fg);border:1px solid var(--bor)}.g{color:var(--fg);border:1px solid var(--bor);background:var(--card)}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--foco);outline-offset:2px}
.ayuda{color:var(--soft);font-size:14px;margin-top:6px}.msg{margin-top:14px}.msg.ok{color:var(--ok)}.msg.bad{color:var(--bad)}
.o{display:flex;align-items:center;gap:12px;color:var(--soft);margin:22px 0 4px;font-size:14px}.o::before,.o::after{content:"";flex:1;border-top:1px solid var(--bor)}
</style></head><body><main class="w">
<h1>Administra tu página</h1><p class="sub"><?php echo esc_html( $nombre ); ?></p>
<?php if ( 'codigo' === $paso ) : ?>
<form method="post"><input type="hidden" name="_n" value="<?php echo esc_attr( $n ); ?>"><input type="hidden" name="accion" value="entrar"><input type="hidden" name="email" value="<?php echo esc_attr( $email ); ?>">
<label for="codigo">Código de 6 números</label><input id="codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required autofocus>
<p class="ayuda">Te lo mandamos a tu correo. Revisa también spam o promociones. Vence en 10 minutos.</p>
<button type="submit">Entrar</button></form>
<form method="get"><button class="sec" type="submit">Mandarme otro código</button></form>
<?php else : ?>
<form method="post"><input type="hidden" name="_n" value="<?php echo esc_attr( $n ); ?>"><input type="hidden" name="accion" value="codigo">
<label for="email">Tu correo</label><input id="email" name="email" type="email" autocomplete="email" value="<?php echo esc_attr( $email ); ?>" required>
<?php if ( $pista ) : ?><p class="ayuda">Entra con el correo que diste al crear tu página (<?php echo esc_html( $pista ); ?>).</p><?php endif; ?>
<button type="submit">Mandarme un código</button></form>
<?php endif; ?>
<?php if ( $google ) : ?><div class="o">o</div><a class="g" href="<?php echo esc_url( $google ); ?>"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</a><?php endif; ?>
<?php if ( $msg ) : ?><p class="msg <?php echo $ok ? 'ok' : 'bad'; ?>" role="status"><?php echo esc_html( $msg ); ?></p><?php endif; ?>
</main></body></html><?php
}

/* ------------------------------------------------------------------ */
/* wp-admin simplificado para el dueño                                 */
/* ------------------------------------------------------------------ */

// Al entrar (o al tocar el Escritorio) va directo a editar su página de inicio con el editor de bloques.
function iaprop_acc_url_inicio() {
	$front = (int) get_option( 'page_on_front' );
	return $front ? admin_url( 'post.php?post=' . $front . '&action=edit' ) : admin_url( 'edit.php?post_type=page' );
}
add_filter( 'login_redirect', function ( $to, $req, $u ) { return ( $u instanceof WP_User && iaprop_acc_es_dueno( $u ) ) ? iaprop_acc_url_inicio() : $to; }, 20, 3 );
add_action( 'load-index.php', function () { if ( iaprop_acc_es_dueno() ) { wp_safe_redirect( iaprop_acc_url_inicio() ); exit; } } );

add_action( 'admin_menu', function () {
	if ( ! iaprop_acc_es_dueno() ) return;
	foreach ( array( 'index.php', 'edit-comments.php', 'tools.php', 'profile.php', 'themes.php', 'plugins.php', 'users.php', 'options-general.php', 'separator1', 'separator2', 'separator-last' ) as $m ) remove_menu_page( $m );
	// Inventario de propiedades solo en inmobiliarias.
	if ( 'inmobiliaria' !== get_option( 'iaprop_arquetipo' ) ) remove_menu_page( 'edit.php?post_type=propiedad' );
	add_menu_page( 'Datos del negocio', 'Datos del negocio', 'edit_pages', 'iaprop-negocio', 'iaprop_acc_pagina_negocio', 'dashicons-store', 3 );
}, 999 );

// Pantallas que el dueño no debe abrir aunque escriba la URL.
add_action( 'current_screen', function ( $s ) {
	if ( ! iaprop_acc_es_dueno() ) return;
	$prohibidas = array( 'dashboard', 'edit-comments', 'tools', 'export', 'import', 'site-health', 'profile', 'my-sites', 'site-editor', 'themes', 'customize', 'widgets', 'nav-menus', 'users' );
	if ( in_array( $s->id, $prohibidas, true ) || in_array( $s->base, $prohibidas, true ) ) { wp_safe_redirect( iaprop_acc_url_inicio() ); exit; }
} );

add_action( 'admin_bar_menu', function ( $bar ) {
	if ( ! iaprop_acc_es_dueno() ) return;
	foreach ( array( 'wp-logo', 'comments', 'new-content', 'my-sites', 'updates', 'customize', 'search', 'edit-profile', 'user-info' ) as $n ) $bar->remove_node( $n );
}, 999 );

add_action( 'admin_init', function () {
	if ( ! iaprop_acc_es_dueno() ) return;
	remove_action( 'admin_notices', 'update_nag', 3 );
	remove_action( 'network_admin_notices', 'update_nag', 3 );
	add_filter( 'admin_footer_text', '__return_empty_string', 99 );
	add_filter( 'update_footer', '__return_empty_string', 99 );
} );

// Editor de bloques completo, sin el editor de código (evita romper el marcado por accidente) y con el bloque de inicio sin borrarse.
add_filter( 'block_editor_settings_all', function ( $s ) {
	if ( iaprop_acc_es_dueno() ) $s['codeEditingEnabled'] = false;
	return $s;
} );
add_filter( 'map_meta_cap', function ( $caps, $cap, $uid, $args ) {
	if ( in_array( $cap, array( 'delete_post', 'delete_page' ), true ) && ! empty( $args[0] ) ) {
		$u = get_user_by( 'id', $uid );
		if ( $u && iaprop_acc_es_dueno( $u ) && in_array( (int) $args[0], array( (int) get_option( 'page_on_front' ), (int) get_option( 'wp_page_for_privacy_policy' ) ), true ) ) return array( 'do_not_allow' );
	}
	return $caps;
}, 10, 4 );

// Estilo: un poco más amable para alguien que no conoce WordPress.
add_action( 'admin_head', function () {
	if ( ! iaprop_acc_es_dueno() ) return;
	echo '<style>#wpadminbar #wp-admin-bar-site-name>.ab-item:before{content:"\f319"}#adminmenu .wp-menu-name{font-size:15px}#contextual-help-link-wrap,#screen-options-link-wrap{display:none}</style>';
} );

/* ---------------- Datos del negocio: logo, nombre y WhatsApp ---------------- */

function iaprop_acc_pagina_negocio() {
	if ( ! current_user_can( 'edit_pages' ) ) wp_die( 'Sin permiso' );
	$guardado = false;
	if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) && check_admin_referer( 'iaprop_negocio' ) ) {
		$nombre = sanitize_text_field( wp_unslash( $_POST['nombre'] ?? '' ) );
		if ( $nombre ) update_option( 'blogname', $nombre );
		update_option( 'iaprop_whatsapp', preg_replace( '/[^\d+]/', '', (string) wp_unslash( $_POST['whatsapp'] ?? '' ) ) );
		update_option( 'iaprop_whatsapp_mensaje', sanitize_text_field( wp_unslash( $_POST['whatsapp_mensaje'] ?? '' ) ) );
		$logo = absint( $_POST['logo'] ?? 0 );
		if ( $logo && wp_attachment_is_image( $logo ) ) { update_option( 'site_logo', $logo ); update_option( 'site_icon', $logo ); }
		$guardado = true;
	}
	wp_enqueue_media();
	$logo_id = (int) get_option( 'site_logo' );
	$logo    = $logo_id ? wp_get_attachment_image_url( $logo_id, 'medium' ) : '';
	?>
	<div class="wrap" style="max-width:640px">
		<h1>Datos del negocio</h1>
		<p>Tu logo, el nombre de tu negocio y el WhatsApp del botón verde que aparece en tu página. Para cambiar textos, productos, precios, horarios o fotos, ve a <a href="<?php echo esc_url( iaprop_acc_url_inicio() ); ?>">Páginas › Inicio</a> y edítalos directo en la página.</p>
		<?php if ( $guardado ) : ?><div class="notice notice-success"><p>Guardado. Ya se ve en tu página.</p></div><?php endif; ?>
		<form method="post">
			<?php wp_nonce_field( 'iaprop_negocio' ); ?>
			<table class="form-table" role="presentation">
				<tr><th><label>Logo</label></th><td>
					<img id="iap-logo-img" src="<?php echo esc_url( $logo ); ?>" alt="" style="max-height:90px;max-width:260px;display:<?php echo $logo ? 'block' : 'none'; ?>;margin-bottom:10px;background:#fff;padding:6px;border:1px solid #ddd;border-radius:8px">
					<input type="hidden" name="logo" id="iap-logo" value="<?php echo esc_attr( $logo_id ); ?>">
					<button type="button" class="button" id="iap-logo-btn">Cambiar logo</button>
				</td></tr>
				<tr><th><label for="nombre">Nombre del negocio</label></th><td><input class="regular-text" id="nombre" name="nombre" value="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"></td></tr>
				<tr><th><label for="whatsapp">WhatsApp</label></th><td><input class="regular-text" id="whatsapp" name="whatsapp" inputmode="tel" value="<?php echo esc_attr( get_option( 'iaprop_whatsapp' ) ); ?>"><p class="description">Con lada, por ejemplo 9991234567. Déjalo vacío para quitar el botón.</p></td></tr>
				<tr><th><label for="whatsapp_mensaje">Mensaje listo al escribirte</label></th><td><input class="regular-text" id="whatsapp_mensaje" name="whatsapp_mensaje" value="<?php echo esc_attr( get_option( 'iaprop_whatsapp_mensaje' ) ); ?>"></td></tr>
			</table>
			<?php submit_button( 'Guardar' ); ?>
		</form>
	</div>
	<script>
	(function(){var b=document.getElementById('iap-logo-btn');if(!b||!window.wp||!wp.media)return;var f;b.addEventListener('click',function(){if(!f){f=wp.media({title:'Elige tu logo',button:{text:'Usar este logo'},library:{type:'image'},multiple:false});f.on('select',function(){var a=f.state().get('selection').first().toJSON();document.getElementById('iap-logo').value=a.id;var i=document.getElementById('iap-logo-img');i.src=(a.sizes&&a.sizes.medium?a.sizes.medium.url:a.url);i.style.display='block'})}f.open()})})();
	</script>
	<?php
}
