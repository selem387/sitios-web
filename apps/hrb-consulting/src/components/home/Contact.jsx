import React from 'react';
import { MessageCircle, MapPin } from 'lucide-react';
import LeadForm from '@/components/LeadForm';
import { CONTACT, whatsappLink } from '@/lib/format';

export default function Contact() {
  return (
    <section id="contacto" className="scroll-mt-24 border-t border-border/50 bg-card/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Contacto</span>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Iniciemos una <span className="text-gold-light">conversación</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Cuéntanos qué tipo de propiedad o inversión buscas: terrenos, preventas, bodegas, renta o
              proyectos de inversión. Un asesor especializado te acompañará en cada paso del proceso.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href={whatsappLink('Hola, me interesa una propiedad / inversión de HRB Consulting.')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-gold-light hover:shadow-[0_0_24px_rgba(212,175,55,0.35)]"
              >
                <MessageCircle className="h-5 w-5" />
                {CONTACT.whatsappDisplay}
              </a>
              <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-gold" />
                {CONTACT.location}
              </p>
            </div>
          </div>

          <LeadForm />
        </div>
      </div>
    </section>
  );
}