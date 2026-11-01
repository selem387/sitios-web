<?php
/**
 * Title: Inmobiliaria: portada con buscador
 * Slug: iaprop-base/inmobiliaria-hero-buscador
 * Description: Portada con botones por tipo de operación y zona.
 * Categories: iaprop-base/inmobiliaria, iaprop-base/hero
 * Keywords: inmobiliaria, hero, buscador, propiedades, casas
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:cover {"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/hero-1.webp","dimRatio":60,"overlayColor":"main","minHeight":560,"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","left":"var:preset|spacing|medium","right":"var:preset|spacing|medium"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-cover alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium);min-height:560px"><img class="wp-block-cover__image-background" alt="" src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/hero-1.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-main-background-color has-background-dim-60 has-background-dim"></span><div class="wp-block-cover__inner-container">
<!-- wp:heading {"textAlign":"center","level":1,"textColor":"base","fontSize":"xx-large"} -->
<h1 class="wp-block-heading has-text-align-center has-base-color has-text-color has-xx-large-font-size"><?php esc_html_e( 'Casas y departamentos en Mérida con asesoría sin comisiones ocultas', 'iaprop-base' ); ?></h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"base","align":"center"} -->
<p class="has-text-align-center has-base-color has-text-color"><?php esc_html_e( 'Te acompañamos desde la primera visita hasta la escritura.', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#propiedades"><?php esc_html_e( 'Quiero comprar', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#propiedades"><?php esc_html_e( 'Quiero rentar', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000"><?php esc_html_e( 'Vender mi propiedad', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
<!-- wp:group {"metadata":{"name":"Zonas"},"layout":{"type":"flex","justifyContent":"center","flexWrap":"wrap"}} -->
<div class="wp-block-group">
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Norte', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Centro', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Oriente', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Playa', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div></div>
<!-- /wp:cover -->
