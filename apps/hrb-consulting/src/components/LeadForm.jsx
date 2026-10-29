import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function LeadForm({ property }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Por favor completa tu nombre y teléfono.');
      return;
    }
    setSending(true);
    try {
      await base44.entities.Lead.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message: form.message.trim() || undefined,
        property_id: property?.id,
        property_title: property?.title,
        source: property ? 'ficha_propiedad' : 'contacto',
      });
      base44.analytics.track({ eventName: 'lead_submitted' });
      setSent(true);
      setForm({ name: '', phone: '', email: '', message: '' });
      toast({ title: 'Mensaje enviado', description: 'Un asesor te contactará próximamente.' });
    } catch (err) {
      setError('No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-gold/40 bg-card p-6 text-center">
        <p className="font-heading text-lg font-semibold text-gold-light">¡Gracias por tu interés!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibimos tu solicitud. Un asesor de HRB Consulting te contactará muy pronto.
        </p>
        <Button variant="outline" className="mt-4 border-gold/40 hover:text-gold-light" onClick={() => setSent(false)}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Nombre *</Label>
          <Input id="lead-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Tu nombre" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone">Teléfono / WhatsApp *</Label>
          <Input id="lead-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+52 ..." required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-email">Correo electrónico</Label>
        <Input id="lead-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tucorreo@ejemplo.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-message">Mensaje</Label>
        <Textarea
          id="lead-message"
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          rows={4}
          placeholder={
            property
              ? `Me interesa la propiedad "${property.title}"...`
              : 'Cuéntanos qué tipo de inversión buscas...'
          }
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground hover:bg-gold-light">
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        {sending ? 'Enviando...' : 'Solicitar información'}
      </Button>
    </form>
  );
}