import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Layers,
  BadgeCheck,
  Shuffle,
  Clock,
  Leaf,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Tier III Design",
    description:
      "N+1 redundancy on all critical systems — power, cooling, network. Your workloads stay running even during maintenance or partial failures.",
    highlight: "N+1 Redundancy",
  },
  {
    icon: BadgeCheck,
    title: "99.999% Uptime SLA",
    description:
      "Contractually guaranteed uptime — not a marketing claim. Less than 6 minutes of downtime per year, backed by financial penalties.",
    highlight: "Contractually Guaranteed",
  },
  {
    icon: Shuffle,
    title: "Carrier Neutral",
    description:
      "20+ network providers in every facility. Choose your carriers, negotiate your own rates, and eliminate single-provider lock-in forever.",
    highlight: "20+ Carriers",
  },
  {
    icon: Clock,
    title: "24/7 NOC",
    description:
      "On-site engineers around the clock — not a remote helpdesk. Real people, in your facility, available every minute of every day.",
    highlight: "On-Site Engineers",
  },
  {
    icon: Leaf,
    title: "Sustainable Power",
    description:
      "100% renewable energy sourcing across all facilities. Meet your ESG targets without sacrificing performance or reliability.",
    highlight: "100% Renewable",
  },
  {
    icon: TrendingUp,
    title: "Instant Scalability",
    description:
      "Start with a single rack and expand to an entire suite within days — not months. Our modular design supports rapid, frictionless growth.",
    highlight: "From 1 to 1,000 Racks",
  },
];

const Features = () => {
  const ref = useRef(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Decorative Lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold tracking-wider uppercase mb-4">
            Why OwnerDC
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Built Different. Built Better.
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            The details that separate enterprise-grade infrastructure from
            everything else.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 24,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.5,
                    },
                  },
                }}
                className="relative bg-slate-900 border border-white/10 rounded-xl p-7 group hover:border-orange-500/40 transition-all duration-300"
                style={{
                  boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
                }}
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-7 h-px w-16 bg-gradient-to-r from-orange-500 to-transparent group-hover:w-24 transition-all duration-300" />

                {/* Icon */}
                <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors duration-300">
                  <Icon className="h-5 w-5 text-orange-500" />
                </div>

                {/* Highlight */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
                    {feature.highlight}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;