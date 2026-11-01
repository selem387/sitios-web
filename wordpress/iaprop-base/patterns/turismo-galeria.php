<?php
/**
 * Title: Turismo: galería
 * Slug: iaprop-base/turismo-galeria
 * Description: Galería amplia de fotos reales.
 * Categories: iaprop-base/turismo, iaprop-base/features
 * Keywords: galeria, fotos, habitaciones, destinos
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:group {"metadata":{"name":"Galería"},"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","right":"var:preset|spacing|medium","left":"var:preset|spacing|medium"},"blockGap":"var:preset|spacing|x-large"}},"layout":{"inherit":true,"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium)">
<!-- wp:group {"metadata":{"name":"Títulos"},"style":{"spacing":{"blockGap":"var:preset|spacing|small"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Así se ve', 'iaprop-base' ); ?></h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:gallery {"columns":3,"linkTo":"none","align":"wide","sizeSlug":"large"} -->
<figure class="wp-block-gallery alignwide has-nested-images columns-3 is-cropped">
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-1.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-2.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-3.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-4.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-5.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-6.webp" alt="<?php esc_attr_e( 'Foto del destino', 'iaprop-base' ); ?>"/></figure>
<!-- /wp:image -->
</figure>
<!-- /wp:gallery -->
</div>
<!-- /wp:group -->
