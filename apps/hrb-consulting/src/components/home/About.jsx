import React from 'react';
import { motion } from 'framer-motion';
import { Quote, TrendingUp } from 'lucide-react';
import { Image } from '@/components/ui/image';

const ABOUT_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';

export default function About() {
  return (
    <section id="nosotros" className="scroll-mt-24 border-t border-border/50 bg-card/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Nosotros</span>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Consultoría que construye <span className="text-gold-light">comunidad y valor</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Somos una consultoría especializada en negocios y en la comercialización de proyectos
                innovadores de inversión, dedicada a crear sinergias y fomentar la Economía Colaborativa.
              </p>
              <p>
                Nuestro enfoque se centra en construir una comunidad sólida a través de alianzas comerciales
                estratégicas, impulsando negocios integrales que generen valor sostenible.
              </p>
              <p>
                Nuestra experiencia en la gestión de activos utilitarios nos permite identificar y
                desarrollar oportunidades de inversión que maximizan el retorno para nuestros clientes y socios.
              </p>
            </div>

            <div className="mt-8 rounded-lg border-l-4 border-primary bg-secondary/50 p-6">
              <Quote className="h-6 w-6 text-gold" />
              <p className="mt-3 font-heading text-base italic leading-relaxed text-foreground sm:text-lg">
                "Nos expandimos estrechamente con socios comerciales para asegurar que cada proyecto e
                inversión se ejecute con la máxima eficacia, eficiencia y efectividad, constantemente
                manteniendo un alto estándar de calidad, integridad y profesionalismo."
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-lg border border-gold/25">
              <Image src={ABOUT_IMAGE} alt="Arquitectura corporativa" className="h-[420px] w-full lg:h-[520px]" />
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-lg border border-gold/40 bg-background p-5 shadow-[0_0_30px_rgba(212,175,55,0.15)] sm:block">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-gold-light" />
                <div>
                  <p className="font-display text-2xl font-semibold text-gold-light">ROI</p>
                  <p className="text-xs text-muted-foreground">Retorno maximizado en cada inversión</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}