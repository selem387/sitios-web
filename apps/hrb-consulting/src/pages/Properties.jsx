import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PropertyCard from '@/components/PropertyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OPERATION_LABELS, TYPE_LABELS } from '@/lib/format';

export default function Properties() {
  const [properties, setProperties] = useState(null);
  const [operation, setOperation] = useState('todas');
  const [type, setType] = useState('todos');
  const [city, setCity] = useState('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.Property.list('-created_date', 200)
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  const cities = useMemo(() => {
    const set = new Set((properties || []).map((p) => p.city).filter(Boolean));
    return [...set].sort();
  }, [properties]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (properties || [])
      .filter((p) => p.status !== 'suspendido')
      .filter((p) => (operation === 'todas' ? true : p.operation_type === operation))
      .filter((p) => (type === 'todos' ? true : p.property_type === type))
      .filter((p) => (city === 'todas' ? true : p.city === city))
      .filter((p) =>
        q
          ? [p.title, p.neighborhood, p.city, p.state, p.property_code, p.description]
              .filter(Boolean)
              .some((v) => v.toLowerCase().includes(q))
          : true
      );
  }, [properties, operation, type, city, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Portafolio</span>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
          Propiedades e <span className="text-gold-light">inversiones</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Encuentra el activo ideal: venta, renta, preventa de terrenos, bodegas, casas, departamentos y más.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gold-light">
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Operación</label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ciudad</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, colonia, clave..." className="pl-8" />
            </div>
          </div>
        </div>
      </div>

      {properties === null ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : visible.length ? (
        <>
          <p className="mt-8 text-sm text-muted-foreground">{visible.length} propiedad{visible.length !== 1 ? 'es' : ''} encontrada{visible.length !== 1 ? 's' : ''}</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-16 rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <p className="font-heading text-lg font-semibold">Sin resultados</p>
          <p className="mt-2 text-sm text-muted-foreground">Ajusta los filtros o contáctanos para encontrar tu inversión ideal.</p>
          <Button
            variant="outline"
            className="mt-6 border-gold/40 hover:text-gold-light"
            onClick={() => { setOperation('todas'); setType('todos'); setCity('todas'); setSearch(''); }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}