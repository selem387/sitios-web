<?php
/**
 * Title: Oficios: portada de urgencias
 * Slug: iaprop-base/oficios-urgencias-hero
 * Description: Portada con botón de llamada y WhatsApp.
 * Categories: iaprop-base/oficios, iaprop-base/hero
 * Keywords: plomero, electricista, urgencias, 24 horas, llamar
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:cover {"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/hero-2.webp","dimRatio":60,"overlayColor":"main","minHeight":560,"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","left":"var:preset|spacing|medium","right":"var:preset|spacing|medium"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-cover alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium);min-height:560px"><img class="wp-block-cover__image-background" alt="" src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/hero-2.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-main-background-color has-background-dim-60 has-background-dim"></span><div class="wp-block-cover__inner-container">
<!-- wp:heading {"textAlign":"center","level":1,"textColor":"base","fontSize":"xx-large"} -->
<h1 class="wp-block-heading has-text-align-center has-base-color has-text-color has-xx-large-font-size"><?php esc_html_e( 'Plomería de urgencia en Mérida, llegamos en menos de una hora', 'iaprop-base' ); ?></h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"base","align":"center"} -->
<p class="has-text-align-center has-base-color has-text-color"><?php esc_html_e( 'Fugas, tuberías tapadas, calentadores y bombas. Cotización gratis y garantía por escrito.', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="tel:+529990000000"><?php esc_html_e( 'Llamar ahora', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000?text=Tengo%20una%20urgencia"><?php esc_html_e( 'WhatsApp', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
<!-- wp:paragraph {"textColor":"base","fontSize":"small","align":"center"} -->
<p class="has-text-align-center has-base-color has-text-color has-small-font-size"><?php esc_html_e( 'Atendemos las 24 horas, también domingos y días festivos.', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
</div></div>
<!-- /wp:cover -->
