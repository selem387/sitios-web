<?php
/**
 * Title: Inmobiliaria: propiedades destacadas
 * Slug: iaprop-base/inmobiliaria-propiedades-destacadas
 * Description: Tres fichas con imagen, precio, recámaras y metros.
 * Categories: iaprop-base/inmobiliaria, iaprop-base/card
 * Keywords: propiedades, destacadas, casas, precio, recamaras
 * Viewport Width: 1500
 * Block Types:
 * Post Types:
 * Inserter: true
 */
?>
<!-- wp:group {"metadata":{"name":"Propiedades destacadas"},"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|xx-large","bottom":"var:preset|spacing|xx-large","right":"var:preset|spacing|medium","left":"var:preset|spacing|medium"},"blockGap":"var:preset|spacing|x-large"}},"layout":{"inherit":true,"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--xx-large);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--xx-large);padding-left:var(--wp--preset--spacing--medium)">
<!-- wp:group {"metadata":{"name":"Títulos"},"style":{"spacing":{"blockGap":"var:preset|spacing|small"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Propiedades destacadas', 'iaprop-base' ); ?></h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center"><?php esc_html_e( 'Seleccionadas por nuestros asesores esta semana.', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Propiedades"},"align":"wide","layout":{"type":"grid","columnCount":3,"minimumColumnWidth":null}} -->
<div class="wp-block-group alignwide">
<!-- wp:group {"metadata":{"name":"Casa en Temozón Norte"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-2.webp" alt="<?php esc_attr_e( 'Casa en Temozón Norte', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Casa en Temozón Norte', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$4,850,000 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( '3 recámaras · 3.5 baños · 280 m²', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Ver propiedad', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Departamento en Montebello"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-3.webp" alt="<?php esc_attr_e( 'Departamento en Montebello', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Departamento en Montebello', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$2,300,000 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( '2 recámaras · 2 baños · 95 m²', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Ver propiedad', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
<!-- wp:group {"metadata":{"name":"Terreno en Conkal"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|large","right":"var:preset|spacing|large","bottom":"var:preset|spacing|large","left":"var:preset|spacing|large"},"blockGap":"var:preset|spacing|small"},"border":{"radius":"5px","width":"1px"}},"backgroundColor":"secondary","borderColor":"border-light","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-border-light-border-color has-secondary-background-color has-background" style="border-width:1px;border-radius:5px;padding-top:var(--wp--preset--spacing--large);padding-right:var(--wp--preset--spacing--large);padding-bottom:var(--wp--preset--spacing--large);padding-left:var(--wp--preset--spacing--large)">
<!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","className":"is-style-rounded"} -->
<figure class="wp-block-image size-large is-style-rounded"><img src="<?php echo esc_url( get_template_directory_uri() ); ?>/patterns/images/image-4.webp" alt="<?php esc_attr_e( 'Terreno en Conkal', 'iaprop-base' ); ?>" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"fontSize":"medium"} -->
<h3 class="wp-block-heading has-medium-font-size"><?php esc_html_e( 'Terreno en Conkal', 'iaprop-base' ); ?></h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"primary","style":{"typography":{"fontStyle":"normal","fontWeight":"600"}}} -->
<p class="has-primary-color has-text-color" style="font-style:normal;font-weight:600"><?php esc_html_e( '$1,150,000 MXN', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"textColor":"main-accent","fontSize":"small"} -->
<p class="has-main-accent-color has-text-color has-small-font-size"><?php esc_html_e( '600 m² · Esquina · Uso habitacional', 'iaprop-base' ); ?></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"left"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Ver propiedad', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#"><?php esc_html_e( 'Ver todas las propiedades', 'iaprop-base' ); ?></a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
