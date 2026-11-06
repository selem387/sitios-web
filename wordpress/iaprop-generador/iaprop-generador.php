<?php
/**
 * Plugin Name: IAprop Generador
 * Description: API REST (iaprop/v1) para que el backend de sitios-web cree y llene sitios del Multisite, y ganchos de front (fuentes, JSON-LD, SEO, robots, llms.txt, botón de WhatsApp).
 * Version: 0.1.0
 * Author: IAprop
 * License: GPL-2.0-or-later
 *
 * Va en wp-content/mu-plugins/ (se carga en todos los sitios de la red sin activarse).
 * Autenticación: header X-IAprop-Key = clave guardada en la opción de red iaprop_gen_key
 * (o constante IAPROP_GEN_KEY / variable de entorno IAPROP_GEN_KEY).
 */

defined( 'ABSPATH' ) || exit;

const IAPROP_GEN_TEMA = 'iaprop-base';

/* ------------------------------------------------------------------ */
/* Autenticación                                                       */
/* ------------------------------------------------------------------ */

function iaprop_gen_clave() {
	if ( defined( 'IAPROP_GEN_KEY' ) && IAPROP_GEN_KEY ) return (string) IAPROP_GEN_KEY;
	$env = getenv( 'IAPROP_GEN_KEY' );
	if ( $env ) return (string) $env;
	return (string) get_site_option( 'iaprop_gen_key', '' );
}

function iaprop_gen_autorizado( WP_REST_Request $req ) {
	$clave = iaprop_gen_clave();
	$dada  = (string) $req->get_header( 'x-iaprop-key' );
	if ( strlen( $clave ) < 24 || ! hash_equals( $clave, $dada ) ) {
		return new WP_Error( 'iaprop_no_autorizado', 'X-IAprop-Key inválida', array( 'status' => 401 ) );
	}
	return true;
}

/**
 * Las peticiones llegan sin sesión: sin usuario, WP aplica kses al guardar (borra settings de los estilos globales,
 * estilos en línea, etc.). Actuamos como el primer super admin y quitamos los filtros kses en la petición.
 */
function iaprop_gen_como_admin() {
	$admins  = get_super_admins();
	$usuario = $admins ? get_user_by( 'login', $admins[0] ) : get_user_by( 'id', 1 );
	if ( $usuario ) wp_set_current_user( $usuario->ID );
	kses_remove_filters();
	return $usuario;
}

/* ------------------------------------------------------------------ */
/* Rutas REST                                                          */
/* ------------------------------------------------------------------ */

add_action( 'rest_api_init', function () {
	if ( ! is_main_site() ) return; // La API vive solo en el sitio principal de la red.
	$ns = 'iaprop/v1';
	register_rest_route( $ns, '/salud', array(
		'methods' => 'GET', 'permission_callback' => 'iaprop_gen_autorizado',
		'callback' => function () {
			$tema = wp_get_theme( IAPROP_GEN_TEMA );
			return array( 'ok' => true, 'wp' => get_bloginfo( 'version' ), 'multisite' => is_multisite(), 'tema' => $tema->exists() ? $tema->get( 'Version' ) : null, 'php' => PHP_VERSION );
		},
	) );
	register_rest_route( $ns, '/sitios', array(
		'methods' => 'POST', 'permission_callback' => 'iaprop_gen_autorizado', 'callback' => 'iaprop_gen_crear_sitio',
	) );
	register_rest_route( $ns, '/sitios/(?P<id>\d+)', array(
		'methods' => 'GET', 'permission_callback' => 'iaprop_gen_autorizado', 'callback' => 'iaprop_gen_estado_sitio',
	) );
	register_rest_route( $ns, '/sitios/(?P<id>\d+)/aplicar', array(
		'methods' => 'POST', 'permission_callback' => 'iaprop_gen_autorizado', 'callback' => 'iaprop_gen_aplicar',
	) );
	register_rest_route( $ns, '/sitios/(?P<id>\d+)/contenido', array(
		'methods' => 'GET', 'permission_callback' => 'iaprop_gen_autorizado', 'callback' => 'iaprop_gen_contenido',
	) );
} );

/**
 * GET /sitios/{id}/contenido → lo que hoy está publicado, en el mismo formato que recibe /aplicar
 * (para editar sobre lo existente: cambios del cliente y respaldo antes de aplicarlos).
 */
function iaprop_gen_contenido( WP_REST_Request $req ) {
	$blog_id = (int) $req['id'];
	if ( ! get_site( $blog_id ) ) return new WP_Error( 'iaprop_no_existe', 'sitio no existe', array( 'status' => 404 ) );
	switch_to_blog( $blog_id );
	try {
		$paginas = array();
		foreach ( get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 50 ) ) as $p ) {
			$paginas[] = array(
				'slug' => $p->post_name, 'titulo' => $p->post_title, 'contenido' => $p->post_content,
				'inicio' => (int) get_option( 'page_on_front' ) === $p->ID,
				'plantilla' => (string) get_post_meta( $p->ID, '_wp_page_template', true ),
				'descripcion' => (string) get_post_meta( $p->ID, '_iaprop_descripcion', true ),
			);
		}
		$partes = array();
		$tema   = get_stylesheet();
		foreach ( array( 'header', 'footer' ) as $parte ) {
			$tp = get_posts( array(
				'post_type' => 'wp_template_part', 'name' => $parte, 'post_status' => 'publish', 'numberposts' => 1,
				'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => $tema ) ),
			) );
			if ( $tp ) $partes[ $parte ] = $tp[0]->post_content;
		}
		$estilos = null;
		if ( class_exists( 'WP_Theme_JSON_Resolver' ) ) {
			$datos = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), false );
			if ( ! empty( $datos['post_content'] ) ) {
				$j = json_decode( $datos['post_content'], true );
				if ( is_array( $j ) ) $estilos = array( 'settings' => $j['settings'] ?? new stdClass(), 'styles' => $j['styles'] ?? new stdClass() );
			}
		}
		$medios = array();
		foreach ( get_posts( array( 'post_type' => 'attachment', 'post_status' => 'any', 'numberposts' => 200, 'meta_key' => '_iaprop_clave' ) ) as $a ) {
			$medios[] = array( 'id' => $a->ID, 'clave' => get_post_meta( $a->ID, '_iaprop_clave', true ), 'url' => wp_get_attachment_image_url( $a->ID, 'full' ), 'alt' => get_post_meta( $a->ID, '_wp_attachment_image_alt', true ), 'origen' => get_post_meta( $a->ID, '_iaprop_origen', true ) );
		}
		$nav = get_posts( array( 'post_type' => 'wp_navigation', 'numberposts' => 1, 'meta_key' => '_iaprop', 'meta_value' => '1', 'post_status' => 'publish' ) );
		$out = array(
			'blog_id' => $blog_id, 'url' => home_url( '/' ),
			'paginas' => $paginas, 'partes' => $partes, 'estilos' => $estilos, 'medios' => $medios,
			'menu' => $nav ? $nav[0]->post_content : '',
			'opciones' => array(
				'descripcion' => get_option( 'blogdescription' ), 'fuentes_url' => get_option( 'iaprop_fuentes_url' ),
				'whatsapp' => get_option( 'iaprop_whatsapp' ), 'whatsapp_mensaje' => get_option( 'iaprop_whatsapp_mensaje' ),
				'site_logo' => (int) get_option( 'site_logo' ),
			),
		);
	} finally {
		restore_current_blog();
	}
	return $out;
}

/** POST /sitios {dominio, titulo, email?} → crea (o reutiliza) el sitio y activa el tema base. */
function iaprop_gen_crear_sitio( WP_REST_Request $req ) {
	$dominio = strtolower( sanitize_text_field( (string) $req->get_param( 'dominio' ) ) );
	$titulo  = sanitize_text_field( (string) $req->get_param( 'titulo' ) );
	if ( ! preg_match( '/^[a-z0-9-]+(\.[a-z0-9-]+)+$/', $dominio ) ) {
		return new WP_Error( 'iaprop_dominio', 'dominio inválido', array( 'status' => 400 ) );
	}
	iaprop_gen_como_admin();
	$existente = get_blog_id_from_url( $dominio, '/' );
	if ( $existente ) {
		$blog_id = (int) $existente;
		$nuevo   = false;
	} else {
		$admins  = get_super_admins();
		$usuario = $admins ? get_user_by( 'login', $admins[0] ) : get_user_by( 'id', 1 );
		$blog_id = wpmu_create_blog( $dominio, '/', $titulo ?: $dominio, $usuario->ID, array( 'public' => 1, 'WPLANG' => 'es_MX' ), get_current_network_id() );
		if ( is_wp_error( $blog_id ) ) return $blog_id;
		$nuevo = true;
	}
	switch_to_blog( $blog_id );
	if ( get_stylesheet() !== IAPROP_GEN_TEMA ) switch_theme( IAPROP_GEN_TEMA );
	if ( $titulo ) update_option( 'blogname', $titulo );
	update_option( 'permalink_structure', '/%postname%/' );
	update_option( 'timezone_string', 'America/Mexico_City' );
	update_option( 'blog_public', 1 );
	update_option( 'default_comment_status', 'closed' );
	// Borrar contenido de ejemplo de un sitio recién creado.
	if ( $nuevo ) {
		foreach ( array( 1, 2, 3 ) as $pid ) { if ( get_post( $pid ) ) wp_delete_post( $pid, true ); }
	}
	flush_rewrite_rules( false );
	$url = home_url( '/' );
	restore_current_blog();
	return array( 'blog_id' => $blog_id, 'url' => $url, 'nuevo' => $nuevo );
}

function iaprop_gen_estado_sitio( WP_REST_Request $req ) {
	$blog_id = (int) $req['id'];
	if ( ! get_site( $blog_id ) ) return new WP_Error( 'iaprop_no_existe', 'sitio no existe', array( 'status' => 404 ) );
	switch_to_blog( $blog_id );
	$out = array(
		'blog_id' => $blog_id, 'url' => home_url( '/' ), 'tema' => get_stylesheet(),
		'inicio' => (int) get_option( 'page_on_front' ),
		'paginas' => array_map( function ( $p ) { return array( 'id' => $p->ID, 'slug' => $p->post_name, 'url' => get_permalink( $p ) ); }, get_posts( array( 'post_type' => 'page', 'numberposts' => 50 ) ) ),
		'generado' => get_option( 'iaprop_generado' ),
	);
	restore_current_blog();
	return $out;
}

/**
 * POST /sitios/{id}/aplicar
 * {
 *   estilos:   {settings, styles}           → estilos globales de usuario del sitio (no toca el tema compartido)
 *   fuentes_url: "https://fonts.googleapis.com/css2?..."
 *   medios:    [{clave, url, alt}]           → se descargan a la biblioteca; {{media:clave}} en el contenido se reemplaza por la URL
 *   paginas:   [{slug, titulo, contenido, inicio?, descripcion?, plantilla?}]
 *   menu:      [{texto, url}]
 *   opciones:  {descripcion, whatsapp, whatsapp_mensaje, jsonld, llms, robots_extra}
 * }
 */
function iaprop_gen_aplicar( WP_REST_Request $req ) {
	$blog_id = (int) $req['id'];
	if ( ! get_site( $blog_id ) ) return new WP_Error( 'iaprop_no_existe', 'sitio no existe', array( 'status' => 404 ) );
	$b = $req->get_json_params();
	iaprop_gen_como_admin();
	switch_to_blog( $blog_id );
	$log = array();
	try {
		// 1) Medios.
		$medios = array();
		if ( ! empty( $b['medios'] ) ) {
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
			foreach ( (array) $b['medios'] as $m ) {
				$clave = sanitize_key( $m['clave'] ?? '' );
				$url   = esc_url_raw( $m['url'] ?? '' );
				if ( ! $clave || ! $url ) continue;
				$previo = get_posts( array( 'post_type' => 'attachment', 'meta_key' => '_iaprop_clave', 'meta_value' => $clave, 'numberposts' => 1, 'post_status' => 'any' ) );
				if ( $previo && get_post_meta( $previo[0]->ID, '_iaprop_origen', true ) === $url ) {
					$id = $previo[0]->ID;
				} else {
					$id = media_sideload_image( $url, 0, sanitize_text_field( $m['alt'] ?? '' ), 'id' );
					if ( is_wp_error( $id ) ) { $log[] = "medio $clave: " . $id->get_error_message(); continue; }
					update_post_meta( $id, '_iaprop_clave', $clave );
					update_post_meta( $id, '_iaprop_origen', $url );
					update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $m['alt'] ?? '' ) );
				}
				$medios[ $clave ] = array( 'id' => $id, 'url' => wp_get_attachment_image_url( $id, 'full' ), 'grande' => wp_get_attachment_image_url( $id, 'large' ) );
			}
		}

		// 2) Estilos globales del sitio (origen "user": manda sobre theme.json sin tocar archivos del tema compartido).
		if ( ! empty( $b['estilos'] ) && class_exists( 'WP_Theme_JSON_Resolver' ) ) {
			WP_Theme_JSON_Resolver::clean_cached_data();
			$datos = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), true );
			$json  = array(
				'version' => 3, 'isGlobalStylesUserThemeJSON' => true,
				'settings' => (object) ( $b['estilos']['settings'] ?? array() ),
				'styles'   => (object) ( $b['estilos']['styles'] ?? array() ),
			);
			if ( ! empty( $datos['ID'] ) ) {
				wp_update_post( array( 'ID' => $datos['ID'], 'post_content' => wp_slash( wp_json_encode( $json ) ) ) );
				$log[] = 'estilos globales ' . $datos['ID'];
			}
			WP_Theme_JSON_Resolver::clean_cached_data();
		}

		// 3) Páginas.
		$ids = array();
		foreach ( (array) ( $b['paginas'] ?? array() ) as $p ) {
			$slug = sanitize_title( $p['slug'] ?? '' );
			if ( ! $slug ) continue;
			$contenido = (string) ( $p['contenido'] ?? '' );
			$contenido = preg_replace_callback( '/\{\{media:([a-z0-9_-]+)(?::(id|grande))?\}\}/', function ( $mm ) use ( $medios ) {
				$m = $medios[ $mm[1] ] ?? null;
				if ( ! $m ) return '';
				$campo = $mm[2] ?? 'url';
				return (string) $m[ $campo ];
			}, $contenido );
			$existe = get_page_by_path( $slug, OBJECT, 'page' );
			$post   = array(
				'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug,
				'post_title' => sanitize_text_field( $p['titulo'] ?? $slug ),
				'post_content' => $contenido, // Marcado de bloques generado por el backend (confiable: viene autenticado).
			);
			if ( $existe ) { $post['ID'] = $existe->ID; $id = wp_update_post( wp_slash( $post ), true ); }
			else { $id = wp_insert_post( wp_slash( $post ), true ); }
			if ( is_wp_error( $id ) ) { $log[] = "página $slug: " . $id->get_error_message(); continue; }
			if ( ! empty( $p['plantilla'] ) ) update_post_meta( $id, '_wp_page_template', sanitize_file_name( $p['plantilla'] ) );
			if ( isset( $p['descripcion'] ) ) update_post_meta( $id, '_iaprop_descripcion', sanitize_text_field( $p['descripcion'] ) );
			$ids[ $slug ] = $id;
			if ( ! empty( $p['inicio'] ) ) {
				update_option( 'show_on_front', 'page' );
				update_option( 'page_on_front', $id );
			}
		}

		// 4) Menú: un wp_navigation propio (el bloque de navegación del header toma el más reciente).
		if ( ! empty( $b['menu'] ) ) {
			$links = '';
			foreach ( (array) $b['menu'] as $l ) {
				$attrs  = array( 'label' => sanitize_text_field( $l['texto'] ?? '' ), 'url' => esc_url_raw( $l['url'] ?? '' ), 'kind' => 'custom', 'isTopLevelLink' => true );
				$links .= '<!-- wp:navigation-link ' . wp_json_encode( $attrs ) . ' /-->';
			}
			$nav = get_posts( array( 'post_type' => 'wp_navigation', 'numberposts' => 1, 'meta_key' => '_iaprop', 'meta_value' => '1', 'post_status' => 'publish' ) );
			$navpost = array( 'post_type' => 'wp_navigation', 'post_status' => 'publish', 'post_title' => 'Menú principal', 'post_content' => $links );
			if ( $nav ) { $navpost['ID'] = $nav[0]->ID; $nid = wp_update_post( wp_slash( $navpost ) ); }
			else { $nid = wp_insert_post( wp_slash( $navpost ) ); update_post_meta( $nid, '_iaprop', '1' ); }
			$log[] = "menú $nid";
		}

		// 4b) Partes de plantilla propias del sitio (p. ej. footer) sin tocar el tema compartido.
		foreach ( (array) ( $b['partes'] ?? array() ) as $parte => $marcado ) {
			$parte = sanitize_key( $parte );
			if ( ! in_array( $parte, array( 'header', 'footer' ), true ) || ! is_string( $marcado ) ) continue;
			$tema   = get_stylesheet();
			$previa = get_posts( array(
				'post_type' => 'wp_template_part', 'name' => $parte, 'post_status' => 'any', 'numberposts' => 1,
				'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => $tema ) ),
			) );
			$marcado = preg_replace_callback( '/\{\{media:([a-z0-9_-]+)(?::(id|grande))?\}\}/', function ( $mm ) use ( $medios ) {
				$m = $medios[ $mm[1] ] ?? null;
				return $m ? (string) $m[ $mm[2] ?? 'url' ] : '';
			}, $marcado );
			$tp = array( 'post_type' => 'wp_template_part', 'post_status' => 'publish', 'post_name' => $parte, 'post_title' => ucfirst( $parte ), 'post_content' => $marcado );
			if ( $previa ) { $tp['ID'] = $previa[0]->ID; $pid = wp_update_post( wp_slash( $tp ), true ); }
			else { $pid = wp_insert_post( wp_slash( $tp ), true ); }
			if ( is_wp_error( $pid ) ) { $log[] = "parte $parte: " . $pid->get_error_message(); continue; }
			wp_set_post_terms( $pid, array( $tema ), 'wp_theme' );
			wp_set_post_terms( $pid, array( $parte ), 'wp_template_part_area' );
			$log[] = "parte $parte $pid";
		}

		// 5) Opciones de front.
		$o = (array) ( $b['opciones'] ?? array() );
		if ( isset( $o['descripcion'] ) ) update_option( 'blogdescription', sanitize_text_field( $o['descripcion'] ) );
		if ( isset( $b['fuentes_url'] ) ) update_option( 'iaprop_fuentes_url', esc_url_raw( $b['fuentes_url'] ) );
		foreach ( array( 'whatsapp', 'whatsapp_mensaje', 'llms', 'robots_extra' ) as $k ) {
			if ( isset( $o[ $k ] ) ) update_option( "iaprop_$k", is_string( $o[ $k ] ) ? wp_unslash( $o[ $k ] ) : '' );
		}
		if ( ! empty( $o['logo_clave'] ) && ! empty( $medios[ $o['logo_clave'] ]['id'] ) ) {
			update_option( 'site_logo', (int) $medios[ $o['logo_clave'] ]['id'] );
			update_option( 'site_icon', (int) $medios[ $o['logo_clave'] ]['id'] );
		}
		if ( ! empty( $o['site_logo'] ) && get_post( (int) $o['site_logo'] ) ) {
			update_option( 'site_logo', (int) $o['site_logo'] );
			update_option( 'site_icon', (int) $o['site_logo'] );
		}
		if ( isset( $o['jsonld'] ) ) update_option( 'iaprop_jsonld', wp_json_encode( $o['jsonld'] ) );
		update_option( 'iaprop_generado', gmdate( 'c' ) );

		$url = home_url( '/' );
	} finally {
		restore_current_blog();
	}
	return array( 'ok' => true, 'url' => $url, 'paginas' => $ids, 'medios' => $medios, 'log' => $log );
}

/* ------------------------------------------------------------------ */
/* Front: aplica en todos los sitios generados                         */
/* ------------------------------------------------------------------ */

function iaprop_gen_es_generado() { return (bool) get_option( 'iaprop_generado' ); }

// Menos peso: sin emojis de WP ni oEmbed discovery en sitios generados.
add_action( 'init', function () {
	if ( ! iaprop_gen_es_generado() ) return;
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
	remove_action( 'wp_head', 'wp_generator' );
} );

// Fuentes de Google (preconnect + display=swap) y metadatos.
add_action( 'wp_head', function () {
	if ( ! iaprop_gen_es_generado() ) return;
	$f = get_option( 'iaprop_fuentes_url' );
	if ( $f ) {
		echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
		echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
		echo '<link rel="stylesheet" href="' . esc_url( $f ) . '">' . "\n";
	}
	$desc = '';
	if ( is_singular() ) $desc = (string) get_post_meta( get_queried_object_id(), '_iaprop_descripcion', true );
	if ( ! $desc ) $desc = get_bloginfo( 'description' );
	if ( $desc ) {
		echo '<meta name="description" content="' . esc_attr( $desc ) . '">' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $desc ) . '">' . "\n";
	}
	echo '<meta property="og:title" content="' . esc_attr( wp_get_document_title() ) . '">' . "\n";
	echo '<meta property="og:type" content="website">' . "\n";
	// Palabras largas en español (p. ej. "Departamentos") no deben desbordar títulos en celular.
	echo '<style>h1,h2,h3,.wp-block-heading{overflow-wrap:break-word;hyphens:auto}</style>' . "\n";
	echo '<meta property="og:locale" content="es_MX">' . "\n";
	echo '<link rel="canonical" href="' . esc_url( is_front_page() ? home_url( '/' ) : ( is_singular() ? get_permalink() : home_url( add_query_arg( array() ) ) ) ) . '">' . "\n";
	$ld = get_option( 'iaprop_jsonld' );
	if ( $ld && is_front_page() ) {
		echo '<script type="application/ld+json">' . str_replace( '</', '<\/', $ld ) . '</script>' . "\n";
	}
}, 2 );

// El tema imprime su propio canonical en singular; evitamos duplicado.
add_action( 'template_redirect', function () {
	if ( iaprop_gen_es_generado() ) remove_action( 'wp_head', 'rel_canonical' );
} );

// Botón flotante de WhatsApp (sin JS, sin dependencias).
add_action( 'wp_footer', function () {
	if ( ! iaprop_gen_es_generado() ) return;
	$num = preg_replace( '/\D/', '', (string) get_option( 'iaprop_whatsapp' ) );
	if ( ! $num ) return;
	$msg = rawurlencode( (string) get_option( 'iaprop_whatsapp_mensaje', '' ) );
	$url = "https://wa.me/$num" . ( $msg ? "?text=$msg" : '' );
	?>
<a class="iaprop-wa" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg>
</a>
<style>.iaprop-wa{position:fixed;right:16px;bottom:16px;z-index:50;display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#1F7A4C;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)}.iaprop-wa:focus-visible{outline:3px solid #111;outline-offset:3px}@media (prefers-reduced-motion:no-preference){.iaprop-wa{transition:transform .15s}.iaprop-wa:hover{transform:scale(1.05)}}</style>
	<?php
} );

// robots.txt: permitir buscadores de IA y apuntar al sitemap nativo.
add_filter( 'robots_txt', function ( $txt, $public ) {
	if ( ! $public || ! iaprop_gen_es_generado() ) return $txt;
	$bots = array( 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended' );
	foreach ( $bots as $bot ) $txt .= "\nUser-agent: $bot\nAllow: /\n";
	$txt .= "\nSitemap: " . home_url( '/wp-sitemap.xml' ) . "\n";
	$extra = (string) get_option( 'iaprop_robots_extra', '' );
	return $txt . ( $extra ? "\n$extra\n" : '' );
}, 20, 2 );

// /llms.txt servido desde la opción iaprop_llms.
add_action( 'parse_request', function () {
	$ruta = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );
	if ( 'llms.txt' !== $ruta ) return;
	$txt = (string) get_option( 'iaprop_llms', '' );
	if ( ! $txt ) return;
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'Cache-Control: public, max-age=3600' );
	echo $txt; // phpcs:ignore WordPress.Security.EscapeOutput -- texto plano.
	exit;
}, 0 );
