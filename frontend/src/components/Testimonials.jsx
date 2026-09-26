
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Migrating our critical payment infrastructure to OwnerDC was the best technology decision we've made in a decade. Downtime has been effectively zero, and their NOC team treated our servers like they were their own.",
    name: "James Whitfield",
    title: "Chief Technology Officer",
    company: "Meridian Financial Group",
    sector: "Financial Services",
  },
  {
    quote:
      "We evaluated every major colocation provider in Australia before choosing OwnerDC. The combination of Tier III certification, genuine carrier neutrality, and on-site technical expertise is unmatched. Three years in, they've exceeded every expectation.",
    name: "Sarah Chen",
    title: "Head of Infrastructure",
    company: "Apex Telecommunications",
    sector: "Telecommunications",
  },
  {
    quote:
      "OwnerDC's direct cloud connectivity has transformed how we deliver applications to our clients. The latency improvements are measurable, and the reliability gives us confidence to offer SLAs we couldn't previously guarantee.",
    name: "Michael Torres",
    title: "VP Engineering",
    company: "Nexus Software Solutions",
    sector: "Enterprise Software",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const intervalRef = useRef(null);
  const ref = useRef(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  const go = (idx) => {
    setDirection(idx > active ? 1 : -1);
    setActive((idx + testimonials.length) % testimonials.length);
  };

  const startAutoplay = () => {
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 6000);
  };

  const stopAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    startAutoplay();

    return () => {
      stopAutoplay();
    };
  }, []);

  const slideVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? 60 : -60,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
      },
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -60 : 60,
      transition: {
        duration: 0.3,
      },
    }),
  };

  const t = testimonials[active];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,174,239,0.05)_0%,transparent_60%)]" />

      <div
        className="container mx-auto px-4 md:px-6 relative z-10"
        ref={ref}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-4">
            Client Stories
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Trusted by Australia's Best
          </h2>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Hear from the enterprise teams who trust us with their most critical
            systems.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="relative bg-card border border-white/8 rounded-2xl p-10 md:p-14 overflow-hidden"
            style={{
              boxShadow: "0 8px 60px rgba(0,174,239,0.08)",
            }}
            onMouseEnter={stopAutoplay}
            onMouseLeave={startAutoplay}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/5 blur-[60px]" />

            <div className="relative z-10">
              <Quote className="h-10 w-10 text-primary/30 mb-8" />

              <div className="min-h-[120px] relative overflow-hidden">
                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={active}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <blockquote className="text-xl md:text-2xl text-white/90 leading-relaxed font-medium mb-10">
                      "{t.quote}"
                    </blockquote>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-lg">
                        {t.name.charAt(0)}
                      </div>

                      <div>
                        <div className="font-bold text-white">
                          {t.name}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {t.title}, {t.company}
                        </div>
                      </div>

                      <div className="ml-auto">
                        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                          {t.sector}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={() => go(active - 1)}
              className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/40 transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === active
                      ? "bg-primary w-8"
                      : "bg-white/20 w-2 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => go(active + 1)}
              className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/40 transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}