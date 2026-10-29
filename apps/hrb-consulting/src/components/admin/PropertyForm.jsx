import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, X } from 'lucide-react';
import { OPERATION_LABELS, TYPE_LABELS, STATUS_LABELS, CONDITION_LABELS, LAND_USE_LABELS } from '@/lib/format';

const DEFAULTS = {
  title: '', property_code: '', operation_type: 'venta', property_type: 'casa', status: 'disponible',
  featured: false, price: '', currency: 'MXN', maintenance_fee: '', negotiable: false,
  description: '', investment_notes: '', internal_notes: '',
  land_area_m2: '', built_area_m2: '', front_m: '', depth_m: '',
  bedrooms: '', bathrooms: '', half_bathrooms: '', parking_spots: '', levels: '', age_years: '',
  condition: 'nuevo', year_built: '', availability_date: '', land_use: 'habitacional', deed_status: '',
  features: '', services: '',
  address: '', neighborhood: '', city: '', state: '', zip_code: '', latitude: '', longitude: '',
};

function Field({ label, children, span = false }) {
  return (
    <div className={`space-y-1.5 ${span ? 'sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4 border-t border-border pt-5 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-light">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function PropertyForm({ property, onDone }) {
  const { toast } = useToast();
  const editing = Boolean(property);
  const [form, setForm] = useState(() => ({
    ...DEFAULTS,
    ...(property || {}),
    features: (property?.features || []).join(', '),
    services: (property?.services || []).join(', '),
  }));
  const [images, setImages] = useState(property?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
  const splitList = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setImages((prev) => [...prev, file_url]);
    } catch (err) {
      toast({ title: 'Error al subir la imagen', variant: 'destructive' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: 'El título es obligatorio', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const {
      id: _id, created_date: _c, updated_date: _u, created_by: _cb, created_by_id: _cbi, views: _v,
      ...rest
    } = form;
    const payload = {
      ...rest,
      title: form.title.trim(),
      price: num(form.price),
      maintenance_fee: num(form.maintenance_fee),
      land_area_m2: num(form.land_area_m2),
      built_area_m2: num(form.built_area_m2),
      front_m: num(form.front_m),
      depth_m: num(form.depth_m),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      half_bathrooms: num(form.half_bathrooms),
      parking_spots: num(form.parking_spots),
      levels: num(form.levels),
      age_years: num(form.age_years),
      year_built: num(form.year_built),
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      features: splitList(form.features),
      services: splitList(form.services),
      images,
    };
    try {
      if (editing) await base44.entities.Property.update(property.id, payload);
      else await base44.entities.Property.create(payload);
      toast({ title: editing ? 'Propiedad actualizada' : 'Propiedad creada' });
      onDone();
    } catch (err) {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card">
      <DialogHeader>
        <DialogTitle className="font-display">{editing ? 'Editar propiedad' : 'Nueva propiedad'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        <Section title="Datos generales">
          <Field label="Título *" span>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Casa modernista en Zona Norte" required />
          </Field>
          <Field label="Clave interna">
            <Input value={form.property_code || ''} onChange={(e) => set('property_code', e.target.value)} placeholder="HRB-0001" />
          </Field>
          <Field label="Operación">
            <Select value={form.operation_type} onValueChange={(v) => set('operation_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo de propiedad">
            <Select value={form.property_type} onValueChange={(v) => set('property_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Estatus">
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={!!form.featured} onCheckedChange={(v) => set('featured', v)} />
            <Label>Destacada (aparece en el carrusel del inicio)</Label>
          </div>
        </Section>

        <Section title="Precio">
          <Field label="Precio">
            <Input type="number" value={form.price ?? ''} onChange={(e) => set('price', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Moneda">
            <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mantenimiento mensual">
            <Input type="number" value={form.maintenance_fee ?? ''} onChange={(e) => set('maintenance_fee', e.target.value)} placeholder="0" />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={!!form.negotiable} onCheckedChange={(v) => set('negotiable', v)} />
            <Label>Precio negociable</Label>
          </div>
        </Section>

        <Section title="Medidas y especificaciones">
          <Field label="Terreno (m²)"><Input type="number" value={form.land_area_m2 ?? ''} onChange={(e) => set('land_area_m2', e.target.value)} /></Field>
          <Field label="Construcción (m²)"><Input type="number" value={form.built_area_m2 ?? ''} onChange={(e) => set('built_area_m2', e.target.value)} /></Field>
          <Field label="Frente (m)"><Input type="number" value={form.front_m ?? ''} onChange={(e) => set('front_m', e.target.value)} /></Field>
          <Field label="Fondo (m)"><Input type="number" value={form.depth_m ?? ''} onChange={(e) => set('depth_m', e.target.value)} /></Field>
          <Field label="Recámaras"><Input type="number" value={form.bedrooms ?? ''} onChange={(e) => set('bedrooms', e.target.value)} /></Field>
          <Field label="Baños"><Input type="number" step="0.5" value={form.bathrooms ?? ''} onChange={(e) => set('bathrooms', e.target.value)} /></Field>
          <Field label="Medios baños"><Input type="number" value={form.half_bathrooms ?? ''} onChange={(e) => set('half_bathrooms', e.target.value)} /></Field>
          <Field label="Estacionamientos"><Input type="number" value={form.parking_spots ?? ''} onChange={(e) => set('parking_spots', e.target.value)} /></Field>
          <Field label="Niveles"><Input type="number" value={form.levels ?? ''} onChange={(e) => set('levels', e.target.value)} /></Field>
          <Field label="Antigüedad (años)"><Input type="number" value={form.age_years ?? ''} onChange={(e) => set('age_years', e.target.value)} /></Field>
          <Field label="Estado de la propiedad">
            <Select value={form.condition} onValueChange={(v) => set('condition', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Año de construcción"><Input type="number" value={form.year_built ?? ''} onChange={(e) => set('year_built', e.target.value)} /></Field>
          <Field label="Disponible desde"><Input type="date" value={form.availability_date || ''} onChange={(e) => set('availability_date', e.target.value)} /></Field>
          <Field label="Uso de suelo">
            <Select value={form.land_use} onValueChange={(v) => set('land_use', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LAND_USE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Situación legal (escrituras)" span>
            <Input value={form.deed_status || ''} onChange={(e) => set('deed_status', e.target.value)} placeholder="Ej. Libre de gravamen" />
          </Field>
        </Section>

        <Section title="Ubicación">
          <Field label="Dirección" span><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Colonia / Fraccionamiento"><Input value={form.neighborhood || ''} onChange={(e) => set('neighborhood', e.target.value)} /></Field>
          <Field label="Ciudad"><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Estado"><Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Código postal"><Input value={form.zip_code || ''} onChange={(e) => set('zip_code', e.target.value)} /></Field>
          <Field label="Latitud"><Input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => set('latitude', e.target.value)} /></Field>
          <Field label="Longitud"><Input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => set('longitude', e.target.value)} /></Field>
        </Section>

        <Section title="Contenido">
          <Field label="Descripción" span>
            <Textarea rows={5} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Describe la propiedad..." />
          </Field>
          <Field label="Potencial de inversión (público)" span>
            <Textarea rows={3} value={form.investment_notes || ''} onChange={(e) => set('investment_notes', e.target.value)} placeholder="Plusvalía, ROI, zona de crecimiento..." />
          </Field>
          <Field label="Notas internas (solo admin)" span>
            <Textarea rows={3} value={form.internal_notes || ''} onChange={(e) => set('internal_notes', e.target.value)} />
          </Field>
          <Field label="Características (separadas por coma)" span>
            <Input value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="Alberca, Jardín, Cocina integral, Seguridad" />
          </Field>
          <Field label="Servicios (separados por coma)" span>
            <Input value={form.services} onChange={(e) => set('services', e.target.value)} placeholder="Agua, Luz, Drenaje, Internet" />
          </Field>
        </Section>

        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-light">Imágenes</h3>
          <div className="flex gap-2">
            <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega la URL de una imagen..." />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (newImageUrl.trim()) {
                  setImages((prev) => [...prev, newImageUrl.trim()]);
                  setNewImageUrl('');
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gold/40 px-3 text-sm font-semibold text-gold-light hover:bg-accent">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={i} className="group relative overflow-hidden rounded-md border border-border">
                  <Image src={img} alt={`Imagen ${i + 1}`} className="h-24 w-full" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded bg-background/80 p-1 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={saving || uploading} className="bg-primary text-primary-foreground hover:bg-gold-light">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear propiedad'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}