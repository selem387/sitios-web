import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Infinity as InfinityIcon } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { LOGO_URL } from '@/components/Navbar';
import { CONTACT, whatsappLink } from '@/lib/format';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Image src={LOGO_URL} alt="HRB Consulting" fittingType="fit" className="h-16 w-[109px]" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-xs">
              Consultoría especializada en negocios y comercialización de proyectos innovadores de inversión.
              Creamos sinergias y fomentamos la Economía Colaborativa.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-light">Navegación</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-gold-light transition-colors">Inicio</Link></li>
              <li><Link to="/propiedades" className="text-muted-foreground hover:text-gold-light transition-colors">Propiedades</Link></li>
              <li><Link to="/#nosotros" className="text-muted-foreground hover:text-gold-light transition-colors">Nosotros</Link></li>
              <li><Link to="/#contacto" className="text-muted-foreground hover:text-gold-light transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-light">Contacto</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                {CONTACT.location}
              </li>
              <li>
                <a
                  href={whatsappLink('Hola, me interesa recibir información de HRB Consulting.')}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 text-muted-foreground hover:text-gold-light transition-colors"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-gold" />
                  {CONTACT.whatsappDisplay}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-border/60 pt-8">
          <div className="flex items-center gap-3 text-gold/70">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
            <InfinityIcon className="h-5 w-5" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HRB Consulting. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}