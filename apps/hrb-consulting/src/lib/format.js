export const CONTACT = {
  whatsapp: '529991593608',
  whatsappDisplay: '+52 999 159 3608',
  location: 'Mérida, Yucatán, México',
};

export function whatsappLink(message) {
  return `https://wa.me/${CONTACT.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function formatPrice(price, currency = 'MXN') {
  if (price === null || price === undefined || price === '') return 'Precio a consultar';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatArea(value) {
  if (value === null || value === undefined || value === '') return null;
  return `${new Intl.NumberFormat('es-MX').format(value)} m²`;
}

export const OPERATION_LABELS = {
  venta: 'En venta',
  renta: 'En renta',
  preventa: 'Preventa',
  venta_renta: 'Venta o renta',
};

export const TYPE_LABELS = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  bodega: 'Bodega',
  oficina: 'Oficina',
  local_comercial: 'Local comercial',
  edificio: 'Edificio',
  desarrollo: 'Desarrollo',
  rancho: 'Rancho',
  otro: 'Otro',
};

export const STATUS_LABELS = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
  rentado: 'Rentado',
  suspendido: 'Suspendido',
};

export const CONDITION_LABELS = {
  nuevo: 'Nuevo',
  usado: 'Usado',
  en_construccion: 'En construcción',
  en_remodelacion: 'En remodelación',
  por_estrenar: 'Por estrenar',
};

export const LAND_USE_LABELS = {
  habitacional: 'Habitacional',
  comercial: 'Comercial',
  industrial: 'Industrial',
  mixto: 'Mixto',
  rustico: 'Rústico',
  turistico: 'Turístico',
};