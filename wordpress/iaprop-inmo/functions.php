<?php
/**
 * IAprop Inmo: configuración mínima del tema de bloques.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('after_setup_theme', function () {
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
});

add_action('init', function () {
    register_block_pattern_category('iaprop-inmo', ['label' => 'Inmobiliaria']);
});

// Aviso en el escritorio si falta el plugin de inventario.
add_action('admin_notices', function () {
    if (!function_exists('iaprop_inm_fields') && current_user_can('activate_plugins')) {
        echo '<div class="notice notice-warning"><p>El tema IAprop Inmo necesita el plugin <strong>IAprop Inmuebles</strong> para mostrar propiedades.</p></div>';
    }
});
