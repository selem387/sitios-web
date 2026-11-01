<?php
/**
 * Title: Tienda: productos destacados
 * Slug: iaprop-base/tienda-productos-destacados
 * Description: Tres productos con precio y botón de pedido por WhatsApp.
 * Categories: iaprop-base/tienda, iaprop-base/card
 * Keywords: productos, destacados, precio, pedir
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:group {"metadata":{"name":"Productos destacados"},"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","right":"var:preset|spacing|medium","left":"var:preset|spacing|medium"},"blockGap":"var:preset|spacing|x-large"}},"layout":{"inherit":true,"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium)">
<!-- wp:group {"metadata":{"name":"Títulos"},"style":{"spacing":{"blockGap":"var:preset|spacing|small"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Productos destacados', 'iaprop-base' ); ?></h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Productos"},"align":"wide","layout":{"type":"grid","columnCount":3,"minimumColumnWidth":null}} -->
<div class="wp-block-group alignwide">
<!-- wp:group {"metadata":{"name":"Producto uno"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-2.webp" alt="<?php esc_attr_e( 'Producto uno', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Producto uno', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$450 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( 'Disponible · Envío en la ciudad', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000?text=Me%20interesa%20el%20producto%20uno"><?php esc_html_e( 'Pedir por WhatsApp', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Producto dos"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-3.webp" alt="<?php esc_attr_e( 'Producto dos', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Producto dos', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$780 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( 'Disponible · Recoger en tienda', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000?text=Me%20interesa%20el%20producto%20dos"><?php esc_html_e( 'Pedir por WhatsApp', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Producto tres"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-4.webp" alt="<?php esc_attr_e( 'Producto tres', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Producto tres', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$1,200 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( 'Sobre pedido · 5 días', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="https://wa.me/5219990000000?text=Me%20interesa%20el%20producto%20tres"><?php esc_html_e( 'Pedir por WhatsApp', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
