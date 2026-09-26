import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";

const solutions = [
  {
    tag: "Colocation",
    title: "Enterprise Colocation",
    description:
      "Bring your own hardware and place it in our purpose-built, carrier-neutral facilities. Get all the benefits of world-class infrastructure without the capital expense of building your own data centre.",
    benefits: [
      "Tier III certified facilities with N+1 redundancy",
      "Flexible rack, cage, and suite options from 1U to full floor",
      "Choice of 20+ network carriers — no lock-in",
      "24/7 remote hands and on-site NOC support",
      "99.999% uptime SLA with financial penalties",
    ],
    cta: "Get Colocation Pricing",
  },
  {
    tag: "Cloud",
    title: "Cloud On-Ramp",
    description:
      "Connect directly to AWS, Azure, Google Cloud, and Oracle Cloud via dedicated private circuits — bypassing the public internet entirely for maximum performance, security, and predictable latency.",
    benefits: [
      "Direct connections to all major public cloud providers",
      "Sub-5ms latency to cloud on-ramps in Sydney",
      "Dedicated bandwidth — no contention or throttling",
      "Managed BGP routing with automatic failover",
      "Unified billing and simplified procurement",
    ],
    cta: "Explore Cloud Connectivity",
  },
  {
    tag: "Managed",
    title: "Managed Hosting",
    description:
      "Hand over the day-to-day complexity to our certified engineering team. From server provisioning and OS patching to 24/7 monitoring and incident response — we keep your infrastructure running so you don't have to.",
    benefits: [
      "Dedicated account management and SLA reporting",
      "Proactive monitoring with sub-minute alerting",
      "OS, firmware, and security patch management",
      "Scheduled maintenance with zero-downtime windows",
      "ITIL-aligned change and incident management",
    ],
    cta: "Talk to Our Team",
  },
];

export default function Solutions() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,174,239,0.04)_0%,transparent_70%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-4">
            Solutions
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            The Right Solution for Every Enterprise
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're starting with a single rack or migrating your entire
            data centre, we have a solution that fits.
          </p>
        </motion.div>

        <div className="space-y-16">
          {solutions.map((solution, i) => (
            <motion.div
              key={solution.tag}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${
                i % 2 === 1 ? "lg:grid-flow-dense" : ""
              }`}
            >
              {/* Text Content */}
              <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase mb-4">
                  {solution.tag}
                </span>

                <h3 className="text-3xl font-extrabold text-white mb-4">
                  {solution.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed mb-7">
                  {solution.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {solution.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <button className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-300">
                  {solution.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Visual Panel */}
              <div
                className={`relative ${
                  i % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""
                }`}
              >
                <div
                  className="relative bg-card border border-white/8 rounded-2xl p-8 h-64 lg:h-80 overflow-hidden"
                  style={{
                    boxShadow: "0 4px 40px rgba(0,174,239,0.08)",
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary rounded-l-2xl" />

                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:30px_30px]" />

                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />

                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-4xl font-extrabold text-primary mb-1">
                          {i === 0 ? "99.999%" : i === 1 ? "<5ms" : "24/7"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {i === 0
                            ? "Uptime Guarantee"
                            : i === 1
                            ? "Cloud Latency"
                            : "Expert Support"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>

                        <span className="text-emerald-400 text-xs font-medium">
                          Live
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(i === 0
                        ? [
                            ["4,200+", "Racks"],
                            ["30 MW", "Power"],
                            ["20+", "Carriers"],
                          ]
                        : i === 1
                        ? [
                            ["4", "Cloud Providers"],
                            ["100G", "Bandwidth"],
                            ["Dual", "Redundant"],
                          ]
                        : [
                            ["15+", "Years Exp."],
                            ["500+", "Clients"],
                            ["<15min", "Response"],
                          ]
                      ).map(([val, label]) => (
                        <div
                          key={label}
                          className="bg-white/4 border border-white/6 rounded-lg p-3"
                        >
                          <div className="text-base font-bold text-white">
                            {val}
                          </div>

                          <div className="text-[11px] text-muted-foreground">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}