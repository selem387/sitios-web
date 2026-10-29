import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';

export default function PropertyCarousel({ properties }) {
  const ref = useRef(null);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!properties?.length) return null;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {properties.map((p) => (
          <div key={p.id} className="w-[85%] shrink-0 snap-start sm:w-[380px] md:w-[420px]">
            <PropertyCard property={p} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => scroll(-1)}
          aria-label="Anterior"
          className="rounded-md border border-border bg-card p-2.5 text-foreground transition-colors hover:border-gold/50 hover:text-gold-light"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll(1)}
          aria-label="Siguiente"
          className="rounded-md border border-border bg-card p-2.5 text-foreground transition-colors hover:border-gold/50 hover:text-gold-light"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}