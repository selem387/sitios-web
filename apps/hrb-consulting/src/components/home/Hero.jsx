import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { whatsappLink } from '@/lib/format';

export default function Hero({ properties }) {
  const bg = properties?.find((p) => p.images?.length)?.images?.[0];

  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden">
      {bg ? (
        <div className="absolute inset-0">
          <Image src={bg} alt="" className="h-full w-full opacity-40" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl rounded-xl border border-gold/25 bg-background/40 p-8 backdrop-blur-md sm:p-10"
        >
          <span className="inline-block rounded-full border border-gold/40 px-4 py-1.5 text-xs font-semibold font-display uppercase tracking-[0.2em] text-gold-light">
            HRB Consulting · Inversión Inmobiliaria
          </span>
          <h1 className="mt-6 font-display text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">
            Sinergias que convierten propiedades en{' '}
            <span className="text-gold-light">inversiones</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Consultoría especializada en la comercialización de proyectos innovadores de inversión.
            Creamos sinergias, fomentamos la Economía Colaborativa y desarrollamos oportunidades que
            maximizan el retorno para nuestros clientes y socios.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/propiedades"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-gold-light hover:shadow-[0_0_24px_rgba(212,175,55,0.35)]"
            >
              Ver propiedades <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink('Hola, me interesa recibir información de HRB Consulting.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gold/50 px-6 py-3 text-sm font-semibold text-gold-light transition-colors hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp directo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}