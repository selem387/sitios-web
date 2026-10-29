import React from 'react';
import { motion } from 'framer-motion';
import { Users, Handshake, Boxes, TrendingUp } from 'lucide-react';

const PILLARS = [
  {
    icon: Users,
    title: 'Economía Colaborativa',
    text: 'Creamos sinergias entre socios, clientes y comunidades para multiplicar el valor de cada proyecto.',
  },
  {
    icon: Handshake,
    title: 'Alianzas Estratégicas',
    text: 'Construimos una comunidad sólida a través de alianzas comerciales que impulsan negocios integrales.',
  },
  {
    icon: Boxes,
    title: 'Activos Utilitarios',
    text: 'Gestión experta de activos que identifica y desarrolla oportunidades de alto rendimiento.',
  },
  {
    icon: TrendingUp,
    title: 'Valor Sostenible',
    text: 'Inversiones diseñadas para generar retorno sostenible en el largo plazo.',
  },
];

export default function Pillars() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Nuestro modelo</span>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            Un ecosistema de <span className="text-gold-light">inversión inteligente</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)]"
            >
              <div className="rounded-md inline-flex p-3 bg-accent text-gold-light transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <pillar.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}