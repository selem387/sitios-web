import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Plus, Pencil, Trash2, Star, Users, ExternalLink, Loader2 } from 'lucide-react';
import PropertyForm from '@/components/admin/PropertyForm';
import {
  formatPrice, OPERATION_LABELS, TYPE_LABELS, STATUS_LABELS,
} from '@/lib/format';

const STATUS_BADGE_CLASS = {
  disponible: 'bg-primary text-primary-foreground',
  reservado: 'bg-accent text-accent-foreground border border-gold/40',
  vendido: 'bg-muted text-muted-foreground',
  rentado: 'bg-muted text-muted-foreground',
  suspendido: 'bg-destructive text-destructive-foreground',
};

const LEAD_STATUSES = ['nuevo', 'contactado', 'calificado', 'cerrado', 'descartado'];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [properties, setProperties] = useState(null);
  const [leads, setLeads] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [props, lds] = await Promise.all([
        base44.entities.Property.list('-created_date', 200),
        base44.entities.Lead.list('-created_date', 200),
      ]);
      setProperties(props);
      setLeads(lds);
    } catch {
      toast({ title: 'No se pudo cargar la información', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setDialogOpen(true); };

  const toggleFeatured = async (p) => {
    try {
      await base44.entities.Property.update(p.id, { featured: !p.featured });
      setProperties((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !p.featured } : x)));
    } catch {
      toast({ title: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await base44.entities.Property.delete(p.id);
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
      toast({ title: 'Propiedad eliminada' });
    } catch {
      toast({ title: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const updateLeadStatus = async (lead, status) => {
    try {
      await base44.entities.Lead.update(lead.id, { status });
      setLeads((prev) => prev.map((x) => (x.id === lead.id ? { ...x, status } : x)));
    } catch {
      toast({ title: 'No se pudo actualizar el lead', variant: 'destructive' });
    }
  };

  const deleteLead = async (lead) => {
    if (!window.confirm('¿Eliminar este lead?')) return;
    try {
      await base44.entities.Lead.delete(lead.id);
      setLeads((prev) => prev.filter((x) => x.id !== lead.id));
    } catch {
      toast({ title: 'No se pudo eliminar el lead', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">HRB Consulting</span>
          <h1 className="mt-2 font-display text-3xl font-semibold">Panel de administración</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-gold-light">
              <Plus className="mr-2 h-4 w-4" /> Nueva propiedad
            </Button>
          </DialogTrigger>
          {dialogOpen && (
            <PropertyForm
              property={editing}
              onDone={() => { setDialogOpen(false); load(); }}
            />
          )}
        </Dialog>
      </div>

      <Tabs defaultValue="propiedades" className="mt-8">
        <TabsList>
          <TabsTrigger value="propiedades" className="gap-2">
            <Building2 className="h-4 w-4" /> Propiedades {properties ? `(${properties.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" /> Leads {leads ? `(${leads.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="propiedades" className="mt-6">
          {properties === null ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
          ) : properties.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">Aún no hay propiedades. Crea la primera.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Propiedad</th>
                    <th className="px-4 py-3">Operación</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-t border-border/60 hover:bg-card/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt="" className="h-12 w-16 shrink-0 rounded" />
                          ) : (
                            <div className="h-12 w-16 shrink-0 rounded bg-secondary" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {[TYPE_LABELS[p.property_type], p.city, p.property_code].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{OPERATION_LABELS[p.operation_type]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPrice(p.price, p.currency)}</td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_BADGE_CLASS[p.status] || ''}>{STATUS_LABELS[p.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleFeatured(p)}
                            title={p.featured ? 'Quitar de destacadas' : 'Marcar como destacada'}
                            className={`rounded p-2 transition-colors hover:bg-accent ${p.featured ? 'text-gold-light' : 'text-muted-foreground'}`}
                          >
                            <Star className={`h-4 w-4 ${p.featured ? 'fill-current' : ''}`} />
                          </button>
                          <Link to={`/propiedad/${p.id}`} title="Ver ficha" className="rounded p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button onClick={() => openEdit(p)} title="Editar" className="rounded p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-gold-light">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(p)} title="Eliminar" className="rounded p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          {leads === null ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
          ) : leads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">Aún no hay leads. Estos aparecerán cuando alguien complete un formulario del sitio.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {lead.name}
                        {lead.status === 'nuevo' && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Nuevo</span>}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lead.phone}{lead.email ? ` · ${lead.email}` : ''} · {new Date(lead.created_date).toLocaleString('es-MX')}
                      </p>
                      {lead.property_title && (
                        <Link to={`/propiedad/${lead.property_id}`} className="mt-1 inline-block text-xs font-medium text-gold-light hover:text-gold">
                          Interés: {lead.property_title}
                        </Link>
                      )}
                      {lead.message && <p className="mt-2 max-w-2xl text-sm text-foreground/90">{lead.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={lead.status} onValueChange={(v) => updateLeadStatus(lead, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => deleteLead(lead)} title="Eliminar lead" className="rounded p-2 text-muted-foreground transition-colors hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}