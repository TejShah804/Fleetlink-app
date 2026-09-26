import { Server, Cloud, Settings, Network, ShieldCheck, LifeBuoy, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Server,
    title: "Colocation",
    description:
      "House your mission-critical servers in our Tier III facilities with guaranteed power redundancy, precise cooling, and 24/7 physical security.",
  },
  {
    icon: Cloud,
    title: "Cloud Connectivity",
    description:
      "Direct, low-latency connections to AWS, Azure, Google Cloud, and Oracle Cloud — bypassing the public internet for maximum reliability.",
  },
  {
    icon: Settings,
    title: "Managed Services",
    description:
      "Let our expert NOC team handle day-to-day operations, monitoring, patching, and incident response so your team can focus on what matters.",
  },
  {
    icon: Network,
    title: "Network & Connectivity",
    description:
      "Access 20+ carrier-neutral network providers with BGP peering, dedicated bandwidth, and SD-WAN solutions tailored to your requirements.",
  },
  {
    icon: LifeBuoy,
    title: "Disaster Recovery",
    description:
      "Geo-redundant backup infrastructure across our three Australian sites, with RTO/RPO guarantees and automated failover capabilities.",
  },
  {
    icon: ShieldCheck,
    title: "Security Services",
    description:
      "Multi-layer physical and cyber security: biometric access, 24/7 CCTV, SIEM, DDoS mitigation, and compliance-ready environments.",
  },
];

function Services() {
  return (
    <section
      id="solutions"
      className="py-24 bg-background relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:60px_60px]"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-4">
            Our Services
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Comprehensive Data Centre Solutions
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything your enterprise needs under one roof — backed by
            iron-clad SLAs and hands-on expert support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative bg-card border border-white/8 rounded-xl p-7 cursor-pointer overflow-hidden hover:-translate-y-1 transition-all duration-300"
              style={{
                boxShadow: "0 4px 24px rgba(0,174,239,0.04)",
              }}
            >
              <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/30 rounded-xl transition-colors duration-300"></div>

              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/3 rounded-xl transition-colors duration-300"></div>

              <div className="relative z-10">
                <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {service.title}
                </h3>

                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  {service.description}
                </p>

                <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all duration-200">
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;