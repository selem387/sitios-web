import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Hero from '@/components/home/Hero';
import About from '@/components/home/About';
import Pillars from '@/components/home/Pillars';
import Contact from '@/components/home/Contact';
import PropertyCarousel from '@/components/PropertyCarousel';
import PropertyCard from '@/components/PropertyCard';

export default function Home() {
  const [properties, setProperties] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.entities.Property.list('-created_date', 100)
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location.hash]);

  const active = (properties || []).filter((p) => p.status === 'disponible' || p.status === 'reservado');
  const featured = active.filter((p) => p.featured);
  const carouselProperties = (featured.length ? featured : active).slice(0, 8);
  const latest = active.slice(0, 6);

  return (
    <div>
      <Hero properties={active} />

      {properties === null ? (
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
          <div className="mt-8 h-64 animate-pulse rounded bg-secondary" />
        </div>
      ) : carouselProperties.length ? (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Portafolio</span>
                <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                  Oportunidades <span className="text-gold-light">destacadas</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Explora nuestro carrusel de propiedades seleccionadas: terrenos, preventas, bodegas y más.
                </p>
              </div>
              <Link
                to="/propiedades"
                className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-gold-light hover:text-gold sm:inline-flex"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8">
              <PropertyCarousel properties={carouselProperties} />
            </div>
          </div>
        </section>
      ) : null}

      {latest.length > 0 && (
        <section className="border-t border-border/50 bg-card/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Inventario</span>
                <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                  Propiedades <span className="text-gold-light">recientes</span>
                </h2>
              </div>
              <Link
                to="/propiedades"
                className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-gold-light hover:text-gold sm:inline-flex"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <About />
      <Pillars />
      <Contact />
    </div>
  );
}