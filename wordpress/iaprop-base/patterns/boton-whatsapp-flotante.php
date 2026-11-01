<?php
/**
 * Title: Botón de WhatsApp flotante
 * Slug: iaprop-base/boton-whatsapp-flotante
 * Description: Botón fijo abajo a la derecha que abre WhatsApp. Cambia el número en el enlace.
 * Categories: iaprop-base/comunes, iaprop-base/call-to-action
 * Keywords: whatsapp, flotante, contacto, boton
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:group {"metadata":{"name":"WhatsApp flotante"},"className":"iaprop-base-wa-flotante","style":{"position":{"type":"sticky","top":"0px"},"spacing":{"padding":{"top":"0","bottom":"0"}}},"layout":{"type":"flex","justifyContent":"right"}} -->
<div class="wp-block-group iaprop-base-wa-flotante" style="padding-top:0;padding-bottom:0">
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000?text=Hola,%20vi%20su%20p%C3%A1gina%20y%20quiero%20informaci%C3%B3n"><?php esc_html_e( 'Escríbenos por WhatsApp', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
