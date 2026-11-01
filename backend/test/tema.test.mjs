import { generarVariaciones, generarThemeJsonHints, contraste } from '../src/entrevista/tema.js';
const estilo = { slug: 'elegante', tipografia: { nombre: 'Classic Elegant', titulos: 'Playfair Display', cuerpo: 'Inter' }, tipografia_alternativa: { nombre: 'Luxury Serif', titulos: 'Cormorant', cuerpo: 'Montserrat' }, theme_json_hints: { radius: '2px', shadow: 'none', spacing: 'amplio', contrast: 'alto' } };
const dental = { paleta: { primary: '#0EA5E9', on_primary: '#0F172A', secondary: '#38BDF8', accent: '#0EA5E9', on_accent: '#0F172A', background: '#F0F9FF', foreground: '#0C4A6E', card: '#FFFFFF', muted: '#E8F2F8', muted_foreground: '#475569', border: '#BAE6FD' }, tipografia_giro: { nombre: 'Medical Clean', titulos: 'Figtree', cuerpo: 'Noto Sans' } };
let ok = 0, n = 0;
const t = (c, m) => { n++; if (c) ok++; console.log(c ? 'OK  ' : 'FAIL', m); };

// Caso 1: dental sin colores de marca; Inter vetada → alternativa
const r1 = generarVariaciones({ estilo, subtipo_diseno: dental, slug_sitio: 'Clínica Sonrisa' });
const col = r1.archivos['styles/colors/clinica-sonrisa.json'];
const tip = r1.archivos['styles/typography/clinica-sonrisa.json'];
t(col && col.version === 3 && col.settings.color.palette.length === 11, 'colores: 11 slugs v3');
t(col.settings.color.palette.map((p) => p.slug).join(',') === 'primary,primary-accent,primary-alt,primary-alt-accent,main,main-accent,base,secondary,tertiary,border-light,border-dark', 'slugs en orden de Ollie');
t(r1.paleta.primary === '#0EA5E9' && r1.paleta.base === '#F0F9FF' && r1.paleta.main === '#0C4A6E', 'mapeo primary/base/main');
t(r1.paleta['primary-accent'] !== r1.paleta.primary, 'primary-accent distinto de primary cuando UUPM los repite');
t(r1.tipografia.cuerpo === 'Montserrat' && r1.tipografia.fuente === 'alternativa', 'Inter vetada → alternativa (Cormorant/Montserrat)');
t(tip.settings.typography.fontFamilies.map((f) => f.slug).join(',') === 'primary,expanded,condensed,narrow,monospace', 'slugs tipográficos de Ollie');
t(tip.googleFontsUrl.includes('Cormorant') && tip.googleFontsUrl.includes('Montserrat'), 'URL de Google Fonts');
t(contraste(r1.paleta.main, r1.paleta.base) >= 4.5, 'contraste texto/fondo AA');

// Caso 2: colores de marca del cliente mandan; hints → patch
const r2 = generarVariaciones({ estilo: { ...estilo, tipografia: { titulos: 'Lora', cuerpo: 'Raleway' } }, subtipo_diseno: dental, colores_marca: ['1E3A8A', '#B45309'], slug_sitio: 'HRB Consulting' });
t(r2.paleta.primary === '#1E3A8A' && r2.paleta['primary-accent'] === '#B45309', 'colores de marca sustituyen primary y primary-accent');
t(r2.tipografia.cuerpo === 'Raleway' && r2.tipografia.fuente === 'estilo', 'tipografía del estilo cuando no está vetada');
const h = generarThemeJsonHints(estilo.theme_json_hints);
t(h.styles.elements.button.border.radius === '2px' && h.settings.spacing.spacingSizes.length === 6 && h.styles.elements.heading.typography.fontWeight === '700', 'hints → radius, spacing escalado, contraste alto');
console.log(`${ok}/${n}`);
if (ok !== n) process.exit(1);
