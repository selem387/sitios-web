<?php
/**
 * Plugin Name: IAprop Inmuebles
 * Description: Inventario de propiedades autoadministrable (tipo de contenido, campos, filtros, bloques y API REST) para sitios de inmobiliarias.
 * Version: 0.1.0
 * Author: IAprop.tech
 * Text Domain: iaprop-inmuebles
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if (!defined('ABSPATH')) {
    exit;
}

const IAPROP_INM_VERSION = '0.1.0';

/**
 * Campos de cada propiedad. Todos quedan expuestos en la API REST (meta) para
 * que n8n, Claude o un CRM puedan crear y actualizar propiedades.
 */
function iaprop_inm_fields(): array {
    return [
        'precio'           => ['type' => 'number',  'label' => 'Precio'],
        'moneda'           => ['type' => 'string',  'label' => 'Moneda', 'default' => 'MXN', 'options' => ['MXN', 'USD']],
        'recamaras'        => ['type' => 'integer', 'label' => 'Recámaras'],
        'banos'            => ['type' => 'number',  'label' => 'Baños'],
        'estacionamientos' => ['type' => 'integer', 'label' => 'Estacionamientos'],
        'm2_construccion'  => ['type' => 'number',  'label' => 'm² de construcción'],
        'm2_terreno'       => ['type' => 'number',  'label' => 'm² de terreno'],
        'direccion'        => ['type' => 'string',  'label' => 'Dirección'],
        'lat'              => ['type' => 'number',  'label' => 'Latitud'],
        'lng'              => ['type' => 'number',  'label' => 'Longitud'],
        'video_url'        => ['type' => 'string',  'label' => 'Video (URL de YouTube o similar)'],
        'tour_url'         => ['type' => 'string',  'label' => 'Recorrido virtual (URL)'],
        'estatus'          => ['type' => 'string',  'label' => 'Estatus', 'default' => 'disponible', 'options' => ['disponible', 'apartada', 'vendida', 'rentada']],
        'destacada'        => ['type' => 'boolean', 'label' => 'Destacada en portada'],
        'clave_interna'    => ['type' => 'string',  'label' => 'Clave interna / EasyBroker ID'],
        'galeria'          => ['type' => 'array',   'label' => 'Galería (IDs de imágenes)'],
    ];
}

add_action('init', function () {
    register_post_type('propiedad', [
        'labels' => [
            'name' => 'Propiedades', 'singular_name' => 'Propiedad', 'add_new' => 'Agregar propiedad',
            'add_new_item' => 'Agregar propiedad', 'edit_item' => 'Editar propiedad', 'view_item' => 'Ver propiedad',
            'all_items' => 'Todas las propiedades', 'search_items' => 'Buscar propiedades', 'not_found' => 'No hay propiedades',
        ],
        'public' => true,
        'has_archive' => 'propiedades',
        'rewrite' => ['slug' => 'propiedad'],
        'menu_icon' => 'dashicons-admin-home',
        'menu_position' => 5,
        'show_in_rest' => true,
        'rest_base' => 'propiedades',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields', 'revisions'],
    ]);

    $tax = [
        'tipo_propiedad' => ['Tipos de propiedad', 'Tipo de propiedad', 'tipo'],
        'operacion'      => ['Operaciones', 'Operación', 'operacion'],
        'zona'           => ['Zonas', 'Zona', 'zona'],
        'amenidad'       => ['Amenidades', 'Amenidad', 'amenidad'],
    ];
    foreach ($tax as $key => [$plural, $singular, $slug]) {
        register_taxonomy($key, 'propiedad', [
            'labels' => ['name' => $plural, 'singular_name' => $singular, 'add_new_item' => "Agregar $singular"],
            'hierarchical' => $key === 'zona' || $key === 'tipo_propiedad',
            'show_in_rest' => true,
            'show_admin_column' => $key !== 'amenidad',
            'rewrite' => ['slug' => $slug],
        ]);
    }

    foreach (iaprop_inm_fields() as $key => $f) {
        $args = [
            'type' => $f['type'],
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => fn() => current_user_can('edit_posts'),
        ];
        if ($f['type'] === 'array') {
            $args['show_in_rest'] = ['schema' => ['type' => 'array', 'items' => ['type' => 'integer']]];
            $args['default'] = [];
        }
        if (isset($f['default'])) {
            $args['default'] = $f['default'];
        }
        register_post_meta('propiedad', $key, $args);
    }
});

add_action('init', function () {
    // Términos iniciales para que el cliente arranque con algo útil.
    if (get_option('iaprop_inm_seeded')) {
        return;
    }
    foreach (['Venta', 'Renta'] as $t) {
        if (!term_exists($t, 'operacion')) wp_insert_term($t, 'operacion');
    }
    foreach (['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina', 'Bodega'] as $t) {
        if (!term_exists($t, 'tipo_propiedad')) wp_insert_term($t, 'tipo_propiedad');
    }
    foreach (['Alberca', 'Jardín', 'Seguridad 24/7', 'Gimnasio', 'Roof garden', 'Cuarto de servicio'] as $t) {
        if (!term_exists($t, 'amenidad')) wp_insert_term($t, 'amenidad');
    }
    update_option('iaprop_inm_seeded', 1);
}, 20);

/* ---------------------------------------------------------------------------
 * Caja de datos en el editor (sin dependencias ni compilación).
 * ------------------------------------------------------------------------- */

add_action('add_meta_boxes', function () {
    add_meta_box('iaprop_inm_datos', 'Datos de la propiedad', 'iaprop_inm_metabox', 'propiedad', 'normal', 'high');
});

function iaprop_inm_metabox(WP_Post $post): void {
    wp_nonce_field('iaprop_inm_save', 'iaprop_inm_nonce');
    wp_enqueue_media();
    echo '<div class="iaprop-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">';
    foreach (iaprop_inm_fields() as $key => $f) {
        if ($key === 'galeria') continue;
        $val = get_post_meta($post->ID, $key, true);
        echo '<p style="margin:0"><label style="display:block;font-weight:600;margin-bottom:4px" for="iaprop_' . esc_attr($key) . '">' . esc_html($f['label']) . '</label>';
        if (!empty($f['options'])) {
            echo '<select style="width:100%" id="iaprop_' . esc_attr($key) . '" name="iaprop[' . esc_attr($key) . ']">';
            foreach ($f['options'] as $o) {
                echo '<option value="' . esc_attr($o) . '"' . selected($val ?: ($f['default'] ?? ''), $o, false) . '>' . esc_html(ucfirst($o)) . '</option>';
            }
            echo '</select>';
        } elseif ($f['type'] === 'boolean') {
            echo '<input type="checkbox" id="iaprop_' . esc_attr($key) . '" name="iaprop[' . esc_attr($key) . ']" value="1"' . checked((bool) $val, true, false) . '>';
        } else {
            $type = in_array($f['type'], ['number', 'integer'], true) ? 'number' : 'text';
            $step = $f['type'] === 'integer' ? '1' : 'any';
            echo '<input style="width:100%" type="' . $type . '" step="' . $step . '" id="iaprop_' . esc_attr($key) . '" name="iaprop[' . esc_attr($key) . ']" value="' . esc_attr((string) $val) . '">';
        }
        echo '</p>';
    }
    echo '</div>';

    $ids = array_filter(array_map('intval', (array) get_post_meta($post->ID, 'galeria', true)));
    echo '<h4 style="margin:18px 0 6px">Galería</h4><div id="iaprop-galeria-preview" style="display:flex;flex-wrap:wrap;gap:6px">';
    foreach ($ids as $id) {
        echo wp_get_attachment_image($id, 'thumbnail', false, ['style' => 'width:80px;height:80px;object-fit:cover;border-radius:6px']);
    }
    echo '</div><input type="hidden" id="iaprop-galeria" name="iaprop[galeria]" value="' . esc_attr(implode(',', $ids)) . '">';
    echo '<p><button type="button" class="button" id="iaprop-galeria-btn">Elegir fotos</button></p>';
    ?>
    <script>
    (function(){
      const btn=document.getElementById('iaprop-galeria-btn');if(!btn)return;
      btn.addEventListener('click',function(){
        const frame=wp.media({title:'Fotos de la propiedad',multiple:'add',library:{type:'image'}});
        frame.on('open',function(){const sel=frame.state().get('selection');(document.getElementById('iaprop-galeria').value||'').split(',').filter(Boolean).forEach(function(id){const a=wp.media.attachment(id);a.fetch();sel.add(a)})});
        frame.on('select',function(){const items=frame.state().get('selection').toJSON();document.getElementById('iaprop-galeria').value=items.map(function(i){return i.id}).join(',');
          document.getElementById('iaprop-galeria-preview').innerHTML=items.map(function(i){const u=(i.sizes&&i.sizes.thumbnail?i.sizes.thumbnail.url:i.url);return '<img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px">'}).join('')});
        frame.open();
      });
    })();
    </script>
    <?php
}

add_action('save_post_propiedad', function (int $post_id) {
    if (!isset($_POST['iaprop_inm_nonce']) || !wp_verify_nonce($_POST['iaprop_inm_nonce'], 'iaprop_inm_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    $in = $_POST['iaprop'] ?? [];
    foreach (iaprop_inm_fields() as $key => $f) {
        $raw = $in[$key] ?? null;
        switch ($f['type']) {
            case 'boolean':
                update_post_meta($post_id, $key, !empty($raw));
                break;
            case 'array':
                update_post_meta($post_id, $key, array_values(array_filter(array_map('intval', explode(',', (string) $raw)))));
                break;
            case 'integer':
                $raw === '' || $raw === null ? delete_post_meta($post_id, $key) : update_post_meta($post_id, $key, (int) $raw);
                break;
            case 'number':
                $raw === '' || $raw === null ? delete_post_meta($post_id, $key) : update_post_meta($post_id, $key, (float) $raw);
                break;
            default:
                update_post_meta($post_id, $key, sanitize_text_field((string) $raw));
        }
    }
});

/* ---------------------------------------------------------------------------
 * Consulta con filtros (usada por los bloques y por ?operacion=&zona=... en el archivo).
 * ------------------------------------------------------------------------- */

function iaprop_inm_query_args(array $f, int $per_page = 12): array {
    $args = [
        'post_type' => 'propiedad',
        'post_status' => 'publish',
        'posts_per_page' => $per_page,
        'paged' => max(1, (int) ($f['pag'] ?? 1)),
        'meta_query' => ['relation' => 'AND'],
        'tax_query' => ['relation' => 'AND'],
    ];
    foreach (['operacion', 'tipo_propiedad', 'zona'] as $t) {
        if (!empty($f[$t])) $args['tax_query'][] = ['taxonomy' => $t, 'field' => 'slug', 'terms' => sanitize_title($f[$t])];
    }
    if (!empty($f['precio_min'])) $args['meta_query'][] = ['key' => 'precio', 'value' => (float) $f['precio_min'], 'compare' => '>=', 'type' => 'NUMERIC'];
    if (!empty($f['precio_max'])) $args['meta_query'][] = ['key' => 'precio', 'value' => (float) $f['precio_max'], 'compare' => '<=', 'type' => 'NUMERIC'];
    if (!empty($f['recamaras'])) $args['meta_query'][] = ['key' => 'recamaras', 'value' => (int) $f['recamaras'], 'compare' => '>=', 'type' => 'NUMERIC'];
    if (!empty($f['destacadas'])) $args['meta_query'][] = ['key' => 'destacada', 'value' => '1'];
    if (empty($f['incluir_vendidas'])) {
        $args['meta_query'][] = ['relation' => 'OR', ['key' => 'estatus', 'compare' => 'NOT EXISTS'], ['key' => 'estatus', 'value' => ['vendida', 'rentada'], 'compare' => 'NOT IN']];
    }
    if (!empty($f['q'])) $args['s'] = sanitize_text_field($f['q']);
    $orden = $f['orden'] ?? 'recientes';
    if ($orden === 'precio_asc' || $orden === 'precio_desc') {
        $args['meta_key'] = 'precio';
        $args['orderby'] = 'meta_value_num';
        $args['order'] = $orden === 'precio_asc' ? 'ASC' : 'DESC';
    }
    return $args;
}

function iaprop_inm_precio(int $id): string {
    $p = get_post_meta($id, 'precio', true);
    if ($p === '' || $p === null) return 'Precio a consultar';
    $m = get_post_meta($id, 'moneda', true) ?: 'MXN';
    return '$' . number_format((float) $p, 0, '.', ',') . ' ' . esc_html($m);
}

function iaprop_inm_card(int $id): string {
    $img = get_the_post_thumbnail($id, 'medium_large', ['class' => 'iaprop-card__img', 'loading' => 'lazy']);
    if (!$img) {
        $gal = (array) get_post_meta($id, 'galeria', true);
        if (!empty($gal[0])) $img = wp_get_attachment_image((int) $gal[0], 'medium_large', false, ['class' => 'iaprop-card__img', 'loading' => 'lazy']);
    }
    $op = wp_get_post_terms($id, 'operacion', ['fields' => 'names']);
    $zona = wp_get_post_terms($id, 'zona', ['fields' => 'names']);
    $est = get_post_meta($id, 'estatus', true);
    $datos = array_filter([
        ($r = get_post_meta($id, 'recamaras', true)) !== '' ? "$r rec." : null,
        ($b = get_post_meta($id, 'banos', true)) !== '' ? "$b baños" : null,
        ($m = get_post_meta($id, 'm2_construccion', true)) !== '' ? number_format((float) $m) . ' m²' : null,
    ]);
    $badge = $est && $est !== 'disponible' ? '<span class="iaprop-card__badge">' . esc_html(ucfirst($est)) . '</span>' : (!empty($op[0]) ? '<span class="iaprop-card__badge">' . esc_html($op[0]) . '</span>' : '');
    return '<article class="iaprop-card"><a href="' . esc_url(get_permalink($id)) . '"><div class="iaprop-card__media">' . $img . $badge . '</div>'
        . '<div class="iaprop-card__body"><p class="iaprop-card__price">' . iaprop_inm_precio($id) . '</p>'
        . '<h3 class="iaprop-card__title">' . esc_html(get_the_title($id)) . '</h3>'
        . (!empty($zona[0]) ? '<p class="iaprop-card__zone">' . esc_html($zona[0]) . '</p>' : '')
        . ($datos ? '<p class="iaprop-card__facts">' . esc_html(implode(' · ', $datos)) . '</p>' : '')
        . '</div></a></article>';
}

/* ---------------------------------------------------------------------------
 * Bloques dinámicos (se renderizan en el servidor; el cliente los inserta desde el editor).
 * ------------------------------------------------------------------------- */

add_action('init', function () {
    wp_register_style('iaprop-inmuebles', plugins_url('assets/inmuebles.css', __FILE__), [], IAPROP_INM_VERSION);
    wp_register_script('iaprop-inmuebles-editor', plugins_url('assets/editor.js', __FILE__), ['wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render', 'wp-i18n'], IAPROP_INM_VERSION, true);

    register_block_type('iaprop/listado-propiedades', [
        'api_version' => 3,
        'title' => 'Listado de propiedades',
        'category' => 'widgets',
        'icon' => 'admin-home',
        'editor_script' => 'iaprop-inmuebles-editor',
        'style' => 'iaprop-inmuebles',
        'attributes' => [
            'cantidad' => ['type' => 'number', 'default' => 9],
            'operacion' => ['type' => 'string', 'default' => ''],
            'soloDestacadas' => ['type' => 'boolean', 'default' => false],
            'usarFiltrosUrl' => ['type' => 'boolean', 'default' => true],
            'columnas' => ['type' => 'number', 'default' => 3],
        ],
        'render_callback' => function (array $a) {
            $f = $a['usarFiltrosUrl'] ? wp_unslash($_GET) : [];
            if (!empty($a['operacion'])) $f['operacion'] = $a['operacion'];
            if (!empty($a['soloDestacadas'])) $f['destacadas'] = 1;
            $q = new WP_Query(iaprop_inm_query_args($f, (int) $a['cantidad']));
            if (!$q->have_posts()) return '<p class="iaprop-empty">No encontramos propiedades con esos filtros.</p>';
            $html = '<div class="iaprop-grid" style="--iaprop-cols:' . (int) $a['columnas'] . '">';
            foreach ($q->posts as $p) $html .= iaprop_inm_card($p->ID);
            $html .= '</div>';
            if ($a['usarFiltrosUrl'] && $q->max_num_pages > 1) {
                $html .= '<nav class="iaprop-pager">' . paginate_links(['total' => $q->max_num_pages, 'current' => max(1, (int) ($_GET['pag'] ?? 1)), 'format' => '?pag=%#%']) . '</nav>';
            }
            return $html;
        },
    ]);

    register_block_type('iaprop/buscador-propiedades', [
        'api_version' => 3,
        'title' => 'Buscador de propiedades',
        'category' => 'widgets',
        'icon' => 'search',
        'editor_script' => 'iaprop-inmuebles-editor',
        'style' => 'iaprop-inmuebles',
        'attributes' => ['destino' => ['type' => 'string', 'default' => '/propiedades/']],
        'render_callback' => function (array $a) {
            $sel = function (string $tax, string $label) {
                $terms = get_terms(['taxonomy' => $tax, 'hide_empty' => false]);
                $cur = sanitize_title($_GET[$tax] ?? '');
                $o = '<option value="">' . esc_html($label) . '</option>';
                foreach ($terms as $t) $o .= '<option value="' . esc_attr($t->slug) . '"' . selected($cur, $t->slug, false) . '>' . esc_html($t->name) . '</option>';
                return '<select name="' . esc_attr($tax) . '">' . $o . '</select>';
            };
            return '<form class="iaprop-search" method="get" action="' . esc_url(home_url($a['destino'])) . '">'
                . $sel('operacion', 'Operación') . $sel('tipo_propiedad', 'Tipo') . $sel('zona', 'Zona')
                . '<input type="number" name="precio_max" placeholder="Precio máximo" value="' . esc_attr($_GET['precio_max'] ?? '') . '">'
                . '<input type="number" name="recamaras" placeholder="Recámaras mín." value="' . esc_attr($_GET['recamaras'] ?? '') . '">'
                . '<button type="submit">Buscar</button></form>';
        },
    ]);

    register_block_type('iaprop/ficha-propiedad', [
        'api_version' => 3,
        'title' => 'Ficha de propiedad (datos, galería y contacto)',
        'category' => 'widgets',
        'icon' => 'id',
        'editor_script' => 'iaprop-inmuebles-editor',
        'style' => 'iaprop-inmuebles',
        'attributes' => ['whatsapp' => ['type' => 'string', 'default' => '']],
        'uses_context' => ['postId'],
        'render_callback' => function (array $a, string $content, WP_Block $block) {
            $id = (int) ($block->context['postId'] ?? get_the_ID());
            if (!$id || get_post_type($id) !== 'propiedad') return '';
            $gal = array_filter(array_map('intval', (array) get_post_meta($id, 'galeria', true)));
            $imgs = '';
            foreach ($gal as $g) $imgs .= '<a href="' . esc_url(wp_get_attachment_url($g)) . '" target="_blank">' . wp_get_attachment_image($g, 'large', false, ['loading' => 'lazy']) . '</a>';
            $facts = '';
            foreach (iaprop_inm_fields() as $k => $f) {
                if (in_array($k, ['galeria', 'lat', 'lng', 'video_url', 'tour_url', 'destacada', 'clave_interna', 'precio', 'moneda'], true)) continue;
                $v = get_post_meta($id, $k, true);
                if ($v === '' || $v === null) continue;
                $facts .= '<li><span>' . esc_html($f['label']) . '</span><strong>' . esc_html(is_numeric($v) ? number_format((float) $v, fmod((float) $v, 1) ? 1 : 0) : ucfirst((string) $v)) . '</strong></li>';
            }
            $amen = wp_get_post_terms($id, 'amenidad', ['fields' => 'names']);
            $wa = preg_replace('/\D/', '', $a['whatsapp'] ?: get_option('iaprop_whatsapp', ''));
            $msg = rawurlencode('Hola, me interesa la propiedad "' . get_the_title($id) . '" ' . get_permalink($id));
            $lat = get_post_meta($id, 'lat', true);
            $lng = get_post_meta($id, 'lng', true);
            return '<section class="iaprop-ficha"><p class="iaprop-ficha__price">' . iaprop_inm_precio($id) . '</p>'
                . ($imgs ? '<div class="iaprop-ficha__gallery">' . $imgs . '</div>' : '')
                . ($facts ? '<ul class="iaprop-ficha__facts">' . $facts . '</ul>' : '')
                . ($amen ? '<p class="iaprop-ficha__amen"><strong>Amenidades:</strong> ' . esc_html(implode(', ', $amen)) . '</p>' : '')
                . ($lat && $lng ? '<iframe class="iaprop-ficha__map" loading="lazy" src="https://maps.google.com/maps?q=' . (float) $lat . ',' . (float) $lng . '&z=15&output=embed"></iframe>' : '')
                . ($wa ? '<a class="iaprop-ficha__wa" href="https://wa.me/' . esc_attr($wa) . '?text=' . $msg . '" target="_blank" rel="noopener">Preguntar por WhatsApp</a>' : '')
                . '</section>';
        },
    ]);
});

// Ajuste global: número de WhatsApp de la inmobiliaria (Ajustes > Generales).
add_action('admin_init', function () {
    register_setting('general', 'iaprop_whatsapp', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'show_in_rest' => true]);
    add_settings_field('iaprop_whatsapp', 'WhatsApp de la inmobiliaria', function () {
        echo '<input type="text" class="regular-text" name="iaprop_whatsapp" value="' . esc_attr(get_option('iaprop_whatsapp', '')) . '" placeholder="5219991234567">';
    }, 'general');
});

// Archivo /propiedades/ con filtros por URL.
add_action('pre_get_posts', function (WP_Query $q) {
    if (is_admin() || !$q->is_main_query() || !$q->is_post_type_archive('propiedad')) return;
    $args = iaprop_inm_query_args(wp_unslash($_GET), 12);
    foreach (['meta_query', 'tax_query', 'meta_key', 'orderby', 'order', 's'] as $k) {
        if (isset($args[$k])) $q->set($k, $args[$k]);
    }
});
