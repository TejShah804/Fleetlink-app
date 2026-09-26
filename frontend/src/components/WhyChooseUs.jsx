import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Fingerprint,
  Zap,
  Network,
  FileText,
  HeadphonesIcon,
  Cpu,
} from "lucide-react";

const differentiators = [
  {
    icon: Fingerprint,
    title: "Physical Security",
    description:
      "Biometric access control, 24/7 CCTV, mantrap entry, security guards, and perimeter fencing — your equipment is never out of our sight.",
  },
  {
    icon: Zap,
    title: "Power Redundancy",
    description:
      "2N power distribution with on-site diesel generators and UPS systems rated for 48+ hours of autonomous operation.",
  },
  {
    icon: Network,
    title: "Network Diversity",
    description:
      "Multiple diverse fibre entry points, carrier-neutral interconnect, and diverse BGP routing eliminate single points of network failure.",
  },
  {
    icon: FileText,
    title: "Compliance Ready",
    description:
      "ISO 27001, PCI-DSS, SOC 2 Type II, and Uptime Institute Tier III certified — we do the heavy lifting so your audits go smoothly.",
  },
  {
    icon: HeadphonesIcon,
    title: "Expert Support",
    description:
      "On-site NOC engineers 24/7/365 — not a call centre. Certified in CCNA, MCSE, and VMware. Average response time under 15 minutes.",
  },
  {
    icon: Cpu,
    title: "Future-Proof Design",
    description:
      "Modular architecture supports densities up to 30 kW/rack today, with clear upgrade paths for liquid cooling and higher power densities.",
  },
];

export default function WhyChooseUs() {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  return (
    <section
      id="about"
      className="py-24 bg-card/40 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div
        className="container mx-auto px-4 md:px-6 relative z-10"
        ref={ref}
      >
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-4">
            The Difference
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            The OwnerDC Difference
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Six things we do better than every other colocation provider in
            Australia.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.09,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {differentiators.map((item, i) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5 },
                  },
                }}
                whileHover={{ y: -4 }}
                className="group bg-background border border-white/8 rounded-xl p-7 hover:border-primary/30 transition-all duration-300 cursor-default"
                style={{
                  boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div className="relative mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  <div className="absolute inset-0 w-12 h-12 bg-primary/5 rounded-xl blur-md group-hover:bg-primary/10 transition-colors duration-300" />
                </div>

                <h3 className="text-lg font-bold text-white mb-3">
                  {item.title}
                </h3>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}