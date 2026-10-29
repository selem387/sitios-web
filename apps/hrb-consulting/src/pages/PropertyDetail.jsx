import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Bed, Bath, Car, Ruler, Building2, Calendar, Landmark,
  FileText, Layers, MessageCircle, ExternalLink, CheckCircle2, ShieldCheck, Sparkles,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Image } from '@/components/ui/image';
import { Badge } from '@/components/ui/badge';
import LeadForm from '@/components/LeadForm';
import {
  formatPrice, formatArea, whatsappLink,
  OPERATION_LABELS, TYPE_LABELS, STATUS_LABELS, CONDITION_LABELS, LAND_USE_LABELS,
} from '@/lib/format';

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [property, setProperty] = useState(undefined);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setProperty(undefined);
    setImgIndex(0);
    base44.entities.Property.get(id)
      .then((p) => {
        setProperty(p);
        base44.analytics.track({ eventName: 'property_viewed' });
      })
      .catch(() => setProperty(null));
  }, [id]);

  if (property === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Propiedad no encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">Es posible que ya no esté disponible o el enlace sea incorrecto.</p>
        <Link to="/propiedades" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-light hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Ver todas las propiedades
        </Link>
      </div>
    );
  }

  const p = property;
  const isRenta = p.operation_type === 'renta' || p.operation_type === 'venta_renta';
  const isAdmin = user?.role === 'admin';
  const images = p.images?.length ? p.images : [];
  const mapsQuery = p.latitude && p.longitude
    ? `${p.latitude},${p.longitude}`
    : [p.address, p.neighborhood, p.city, p.state, p.zip_code].filter(Boolean).join(', ');

  const specs = [
    { icon: Ruler, label: 'Superficie de terreno', value: formatArea(p.land_area_m2) },
    { icon: Building2, label: 'Superficie construida', value: formatArea(p.built_area_m2) },
    { icon: Ruler, label: 'Frente / Fondo', value: p.front_m ? `${p.front_m} m / ${p.depth_m ?? '—'} m` : null },
    { icon: Bed, label: 'Recámaras', value: p.bedrooms },
    { icon: Bath, label: 'Baños', value: p.bathrooms ? `${p.bathrooms}${p.half_bathrooms ? ` + ${p.half_bathrooms} ½` : ''}` : null },
    { icon: Car, label: 'Estacionamientos', value: p.parking_spots },
    { icon: Layers, label: 'Niveles', value: p.levels },
    { icon: Calendar, label: 'Antigüedad', value: p.age_years === 0 || p.age_years ? `${p.age_years} año${p.age_years !== 1 ? 's' : ''}` : null },
    { icon: Sparkles, label: 'Estado', value: CONDITION_LABELS[p.condition] || p.condition },
    { icon: Calendar, label: 'Año de construcción', value: p.year_built },
    { icon: Calendar, label: 'Disponible desde', value: p.availability_date },
    { icon: Landmark, label: 'Uso de suelo', value: LAND_USE_LABELS[p.land_use] || p.land_use },
    { icon: ShieldCheck, label: 'Situación legal', value: p.deed_status },
    { icon: Building2, label: 'Mantenimiento', value: p.maintenance_fee ? `${formatPrice(p.maintenance_fee, p.currency)} /mes` : null },
  ].filter((s) => Boolean(s.value));

  const whatsappMsg = `Hola, me interesa la propiedad "${p.title}"${p.property_code ? ` (clave ${p.property_code})` : ''} que vi en el sitio de HRB Consulting.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/propiedades" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light">
        <ArrowLeft className="h-4 w-4" /> Volver a propiedades
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">{OPERATION_LABELS[p.operation_type] || p.operation_type}</Badge>
            <Badge variant="outline" className="border-gold/40 text-gold-light">{TYPE_LABELS[p.property_type] || p.property_type}</Badge>
            {p.status !== 'disponible' && <Badge variant="secondary">{STATUS_LABELS[p.status] || p.status}</Badge>}
            {p.property_code && <span className="text-xs text-muted-foreground">Clave: {p.property_code}</span>}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{p.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-gold" />
            {[p.address, p.neighborhood, p.city, p.state].filter(Boolean).join(', ') || 'Ubicación a consultar'}
          </p>

          {images.length > 0 && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-lg border border-border bg-secondary">
                <Image src={images[imgIndex]} alt={p.title} className="h-[320px] w-full sm:h-[460px]" />
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`h-20 w-28 shrink-0 overflow-hidden rounded-md border transition-all ${
                        i === imgIndex ? 'border-gold' : 'border-border opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={img} alt={`Foto ${i + 1}`} className="h-20 w-28" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {p.description && (
            <div className="mt-8">
              <h2 className="font-heading text-xl font-semibold">Descripción</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">{p.description}</p>
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-heading text-xl font-semibold">Especificaciones</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
                  <s.icon className="h-5 w-5 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="truncate text-sm font-medium">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(p.features?.length || p.services?.length) && (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {p.features?.length > 0 && (
                <div>
                  <h2 className="font-heading text-lg font-semibold">Características</h2>
                  <ul className="mt-3 grid gap-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.services?.length > 0 && (
                <div>
                  <h2 className="font-heading text-lg font-semibold">Servicios</h2>
                  <ul className="mt-3 grid gap-2">
                    {p.services.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {p.investment_notes && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 rounded-lg border border-gold/30 bg-accent p-6"
            >
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-gold-light">
                <FileText className="h-5 w-5" /> Potencial de inversión
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{p.investment_notes}</p>
            </motion.div>
          )}

          {isAdmin && p.internal_notes && (
            <div className="mt-8 rounded-lg border border-dashed border-border bg-secondary/50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas internas (solo administradores)</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.internal_notes}</p>
            </div>
          )}

          {mapsQuery && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold-light hover:text-gold"
            >
              <MapPin className="h-4 w-4" /> Ver ubicación en Google Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-lg border border-gold/30 bg-card p-6 shadow-[0_0_30px_rgba(212,175,55,0.08)]">
              <p className="text-xs text-muted-foreground">{OPERATION_LABELS[p.operation_type] || 'Precio'}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-gold-light">
                {formatPrice(p.price, p.currency)}{isRenta ? <span className="text-base font-normal text-muted-foreground"> /mes</span> : null}
              </p>
              {p.negotiable && <p className="mt-1 text-xs text-muted-foreground">Precio negociable</p>}
              <a
                href={whatsappLink(whatsappMsg)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-gold-light hover:shadow-[0_0_24px_rgba(212,175,55,0.35)]"
              >
                <MessageCircle className="h-4 w-4" /> Me interesa esta propiedad
              </a>
              <p className="mt-3 text-center text-xs text-muted-foreground">Respuesta por WhatsApp normalmente en minutos.</p>
            </div>

            <LeadForm property={p} />
          </div>
        </aside>
      </div>
    </div>
  );
}