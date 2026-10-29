import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Image } from '@/components/ui/image';
import { whatsappLink } from '@/lib/format';

export const LOGO_URL = '/logo-hrb.jpg';

const LINKS = [
  { label: 'Inicio', to: '/' },
  { label: 'Propiedades', to: '/propiedades' },
  { label: 'Nosotros', to: '/#nosotros' },
  { label: 'Contacto', to: '/#contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to.split('#')[0]) && to !== '/');

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center shrink-0" onClick={() => setOpen(false)}>
            <Image src={LOGO_URL} alt="HRB Consulting" fittingType="fit" className="h-[4.5rem] w-[7.7rem] ml-[19px]" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors hover:text-gold-light ${
                  isActive(link.to) ? 'text-gold-light' : 'text-foreground/80'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1.5 text-sm font-medium text-gold-light">
                <ShieldCheck className="h-4 w-4" />
                Administración
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href={whatsappLink('Hola, me interesa recibir información de HRB Consulting.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-gold-light hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            {user && (
              <button
                onClick={() => logout()}
                title="Cerrar sesión"
                className="inline-flex items-center justify-center rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground hover:border-gold/50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <nav className="px-4 py-4 flex flex-col gap-3">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-foreground/90 hover:text-gold-light"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="text-sm font-medium text-gold-light">
                Administración
              </Link>
            )}
            <a
              href={whatsappLink('Hola, me interesa recibir información de HRB Consulting.')}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            {user && (
              <button
                onClick={() => logout()}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}