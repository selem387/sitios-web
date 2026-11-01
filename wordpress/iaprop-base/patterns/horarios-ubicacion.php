<?php
/**
 * Title: Horarios y ubicación
 * Slug: iaprop-base/horarios-ubicacion
 * Description: Horario de atención junto a un mapa. Reemplazar el placeholder del mapa por el embed de Google Maps.
 * Categories: iaprop-base/comunes, iaprop-base/features
 * Keywords: horario, ubicacion, mapa, direccion, contacto
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:group {"metadata":{"name":"Horarios y ubicación"},"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","right":"var:preset|spacing|medium","left":"var:preset|spacing|medium"},"blockGap":"var:preset|spacing|x-large"}},"layout":{"inherit":true,"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium)">
<!-- wp:group {"metadata":{"name":"Títulos"},"style":{"spacing":{"blockGap":"var:preset|spacing|small"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"textAlign":"left"} -->
<h2 class="wp-block-heading has-text-align-left"><?php esc_html_e( 'Horarios y ubicación', 'iaprop-base' ); ?></h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:columns {"align":"wide","verticalAlignment":"center","style":{"spacing":{"blockGap":{"top":"var:preset|spacing|large","left":"var:preset|spacing|large"}}}} -->
<div class="wp-block-columns alignwide are-vertically-aligned-center">
<!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center">
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Horario de atención', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph  -->
<p><?php esc_html_e( 'Lunes a viernes: 9:00 a 19:00', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph  -->
<p><?php esc_html_e( 'Sábado: 9:00 a 14:00', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent"} -->
<p class="has-main-accent-color has-text-color"><?php esc_html_e( 'Domingo: cerrado', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Dirección', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph  -->
<p><?php esc_html_e( 'Calle 60 núm. 123, Col. Centro, Mérida, Yucatán', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://maps.google.com"><?php esc_html_e( 'Cómo llegar', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="tel:+529990000000"><?php esc_html_e( 'Llamar', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center">
<!-- wp:html -->
<div class="iaprop-base-mapa" style="aspect-ratio:4/3;background:var(--wp--preset--color--tertiary);border-radius:5px;display:flex;align-items:center;justify-content:center;color:var(--wp--preset--color--main-accent)">Mapa de Google (pegar iframe aquí)</div>
<!-- /wp:html -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->
