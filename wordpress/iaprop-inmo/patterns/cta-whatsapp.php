<?php
/**
 * Title: Llamado a la acción por WhatsApp
 * Slug: iaprop-inmo/cta-whatsapp
 * Categories: iaprop-inmo, call-to-action
 * Keywords: whatsapp, contacto, cta
 * Description: Franja con invitación a escribir por WhatsApp.
 */
$wa = preg_replace('/\D/', '', (string) get_option('iaprop_whatsapp', '5219990000000'));
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained","contentSize":"860px"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">
<!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">¿Tienes una propiedad en mente?</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","textColor":"muted","fontSize":"large"} -->
<p class="has-text-align-center has-muted-color has-text-color has-large-font-size">Escríbenos y un asesor te responde en minutos.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#25D366"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" href="https://wa.me/<?php echo esc_attr($wa); ?>" style="background-color:#25D366" target="_blank" rel="noreferrer noopener">Escribir por WhatsApp</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
