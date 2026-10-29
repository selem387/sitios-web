import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Car, Ruler, ArrowRight } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { formatPrice, formatArea, OPERATION_LABELS, TYPE_LABELS, STATUS_LABELS } from '@/lib/format';

export default function PropertyCard({ property }) {
  const p = property;
  const image = p.images?.[0];
  const isRenta = p.operation_type === 'renta' || p.operation_type === 'venta_renta';

  return (
    <Link to={`/propiedad/${p.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]">
        <div className="relative h-52 overflow-hidden bg-secondary">
          {image ? (
            <Image
              src={image}
              alt={p.title}
              className="h-52 w-full transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-52 items-center justify-center text-muted-foreground text-sm">Sin imagen</div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              {OPERATION_LABELS[p.operation_type] || p.operation_type}
            </span>
            {p.status !== 'disponible' && (
              <span className="rounded-md bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
                {STATUS_LABELS[p.status] || p.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-xl font-semibold text-gold-light">{formatPrice(p.price, p.currency)}{isRenta ? <span className="text-sm font-normal"> /mes</span> : null}</p>
          </div>
          <h3 className="mt-1.5 line-clamp-2 font-heading text-base font-semibold text-foreground">{p.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
            {[p.neighborhood, p.city].filter(Boolean).join(', ') || 'Ubicación a consultar'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="rounded-sm bg-secondary px-2 py-1 text-foreground/90">{TYPE_LABELS[p.property_type] || p.property_type}</span>
            {formatArea(p.land_area_m2) && (
              <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-gold/70" />Terreno {formatArea(p.land_area_m2)}</span>
            )}
            {formatArea(p.built_area_m2) && (
              <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-gold/70" />Construido {formatArea(p.built_area_m2)}</span>
            )}
            {p.bedrooms ? <span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5 text-gold/70" />{p.bedrooms} rec</span> : null}
            {p.bathrooms ? <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-gold/70" />{p.bathrooms} baños</span> : null}
            {p.parking_spots ? <span className="flex items-center gap-1.5"><Car className="h-3.5 w-3.5 text-gold/70" />{p.parking_spots} est</span> : null}
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-light opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Ver detalles <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </article>
    </Link>
  );
}