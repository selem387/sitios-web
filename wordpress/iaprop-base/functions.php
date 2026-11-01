<?php
/**
 * This file adds functions to the Ollie WordPress theme.
 *
 * @package iaprop-base
 * @author  Mike McAlister
 * @license GNU General Public License v2 or later
 * @link    https://iaprop.tech
 */

namespace Ollie;

/**
 * Set up theme defaults and register various WordPress features.
 */
function setup() {

	// Enqueue editor styles and fonts.
	add_editor_style( 'style.css' );

	// Remove core block patterns.
	remove_theme_support( 'core-block-patterns' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );


/**
 * Enqueue styles.
 */
function enqueue_style_sheet() {
	wp_enqueue_style( sanitize_title( __NAMESPACE__ ), get_template_directory_uri() . '/style.css', array(), wp_get_theme()->get( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_sheet' );


/**
 * Add block style variations.
 */
function register_block_styles() {

	$block_styles = array(
		'core/list'         => array(
			'list-check'        => __( 'Check', 'iaprop-base' ),
			'list-check-circle' => __( 'Check Circle', 'iaprop-base' ),
			'list-boxed'        => __( 'Boxed', 'iaprop-base' ),
		),
		'core/code'         => array(
			'dark-code' => __( 'Dark', 'iaprop-base' ),
		),
		'core/cover'        => array(
			'blur-image-less' => __( 'Blur Image Less', 'iaprop-base' ),
			'blur-image-more' => __( 'Blur Image More', 'iaprop-base' ),
			'rounded-cover'   => __( 'Rounded', 'iaprop-base' ),
		),
		'core/post-excerpt' => array(
			'excerpt-truncate-2' => __( 'Truncate 2 Lines', 'iaprop-base' ),
			'excerpt-truncate-3' => __( 'Truncate 3 Lines', 'iaprop-base' ),
			'excerpt-truncate-4' => __( 'Truncate 4 Lines', 'iaprop-base' ),
		),
		'core/separator'    => array(
			'separator-dotted' => __( 'Dotted', 'iaprop-base' ),
			'separator-thin'   => __( 'Thin', 'iaprop-base' ),
		),
		'core/image'        => array(
			'rounded-full' => __( 'Rounded Full', 'iaprop-base' ),
			'media-boxed'  => __( 'Boxed', 'iaprop-base' ),
		),
		'core/preformatted' => array(
			'preformatted-dark' => __( 'Dark Style', 'iaprop-base' ),
		),
		'core/post-terms'   => array(
			'term-button' => __( 'Button Style', 'iaprop-base' ),
		),
		'core/video'        => array(
			'media-boxed' => __( 'Boxed', 'iaprop-base' ),
		),
	);

	foreach ( $block_styles as $block => $styles ) {
		foreach ( $styles as $style_name => $style_label ) {
			register_block_style(
				$block,
				array(
					'name'  => $style_name,
					'label' => $style_label,
				)
			);
		}
	}
}
add_action( 'init', __NAMESPACE__ . '\register_block_styles' );


/**
 * Load custom block styles only when the block is used.
 */
function enqueue_custom_block_styles() {

	// Scan our styles folder to locate block styles.
	$files = glob( get_template_directory() . '/assets/styles/*.css' );

	foreach ( $files as $file ) {

		// Get the filename and core block name.
		$filename   = basename( $file, '.css' );
		$block_name = str_replace( 'core-', 'core/', $filename );

		wp_enqueue_block_style(
			$block_name,
			array(
				'handle' => "iaprop-base-block-{$filename}",
				'src'    => get_theme_file_uri( "assets/styles/{$filename}.css" ),
				'path'   => get_theme_file_path( "assets/styles/{$filename}.css" ),
			)
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\enqueue_custom_block_styles' );


/**
 * Register pattern categories.
 */
function pattern_categories() {

	$block_pattern_categories = array(
		'iaprop-base/card' => array(
			'label' => __( 'Tarjetas', 'iaprop-base' ),
		),
		'iaprop-base/call-to-action' => array(
			'label' => __( 'Llamadas a la acción', 'iaprop-base' ),
		),
		'iaprop-base/features' => array(
			'label' => __( 'Características', 'iaprop-base' ),
		),
		'iaprop-base/hero' => array(
			'label' => __( 'Portadas', 'iaprop-base' ),
		),
		'iaprop-base/pages' => array(
			'label' => __( 'Páginas', 'iaprop-base' ),
		),
		'iaprop-base/testimonial' => array(
			'label' => __( 'Testimonios', 'iaprop-base' ),
		),
		'iaprop-base/comunes' => array(
			'label' => __( 'Comunes', 'iaprop-base' ),
		),
		'iaprop-base/inmobiliaria' => array(
			'label' => __( 'Inmobiliaria', 'iaprop-base' ),
		),
		'iaprop-base/clinica' => array(
			'label' => __( 'Clínica', 'iaprop-base' ),
		),
		'iaprop-base/restaurante' => array(
			'label' => __( 'Restaurante', 'iaprop-base' ),
		),
		'iaprop-base/servicios' => array(
			'label' => __( 'Servicios profesionales', 'iaprop-base' ),
		),
		'iaprop-base/tienda' => array(
			'label' => __( 'Tienda', 'iaprop-base' ),
		),
		'iaprop-base/oficios' => array(
			'label' => __( 'Oficios', 'iaprop-base' ),
		),
		'iaprop-base/educacion' => array(
			'label' => __( 'Educación', 'iaprop-base' ),
		),
		'iaprop-base/turismo' => array(
			'label' => __( 'Turismo', 'iaprop-base' ),
		),
	);

	foreach ( $block_pattern_categories as $name => $properties ) {
		register_block_pattern_category( $name, $properties );
	}
}
add_action( 'init', __NAMESPACE__ . '\pattern_categories', 9 );


/**
 * Remove last separator on blog/archive if no pagination exists.
 */
function is_paginated() {
	global $wp_query;
	if ( $wp_query->max_num_pages < 2 ) {
		echo '<style>.blog .wp-block-post-template .wp-block-post:last-child .entry-content + .wp-block-separator, .archive .wp-block-post-template .wp-block-post:last-child .entry-content + .wp-block-separator, .blog .wp-block-post-template .wp-block-post:last-child .entry-content + .wp-block-separator, .search .wp-block-post-template .wp-block-post:last-child .wp-block-post-excerpt + .wp-block-separator { display: none; }</style>';
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\is_paginated' );


/**
 * Add a Sidebar template part area
 */
function template_part_areas( array $areas ) {
	$areas[] = array(
		'area'        => 'sidebar',
		'area_tag'    => 'section',
		'label'       => __( 'Sidebar', 'iaprop-base' ),
		'description' => __( 'The Sidebar template defines a page area that can be found on the Page (With Sidebar) template.', 'iaprop-base' ),
		'icon'        => 'sidebar',
	);

	return $areas;
}
add_filter( 'default_wp_template_part_areas', __NAMESPACE__ . '\template_part_areas' );

/**
 * Restore per-submenu aria-expanded behavior in the navigation block.
 *
 * WordPress 7.1 binds submenu toggles to `state.isSubmenuOpen`, which reports
 * true for every toggle while the mobile overlay is open. Ollie collapses
 * submenus inside the overlay and keys their visibility off aria-expanded,
 * so rebind the toggles to `state.isMenuOpen`, which tracks each submenu's
 * own open state as core did before 7.1.
 */
function fix_submenu_toggle_binding( $block_content ) {
	$tags = new \WP_HTML_Tag_Processor( $block_content );

	while ( $tags->next_tag(
		array(
			'tag_name'   => 'BUTTON',
			'class_name' => 'wp-block-navigation-submenu__toggle',
		)
	) ) {
		if ( 'state.isSubmenuOpen' === $tags->get_attribute( 'data-wp-bind--aria-expanded' ) ) {
			$tags->set_attribute( 'data-wp-bind--aria-expanded', 'state.isMenuOpen' );
		}
	}

	return $tags->get_updated_html();
}
add_filter( 'render_block_core/navigation', __NAMESPACE__ . '\fix_submenu_toggle_binding' );

