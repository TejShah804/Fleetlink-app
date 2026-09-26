const steps = [
  {
    number: "01",
    label: "Job submitted",
    icon: "https://cdn.sanity.io/images/58hwvab6/production/3d162c6fb8179c879cf707d663d949136587e9fd-500x500.png",
    alt: "Digital checklist for freight tasks.",
  },
  {
    number: "02",
    label: "Work reviewed",
    icon: "https://cdn.sanity.io/images/58hwvab6/production/cd63388a8c0a2d7c38b65aeabe1bbf704f94f340-500x500.png",
    alt: "Freight document review and verification.",
  },
  {
    number: "03",
    label: "Compliant allocation",
    icon: "https://cdn.sanity.io/images/58hwvab6/production/d854c669571c9741357d8b9fa9457e301dffe605-500x500.png",
    alt: "Verified freight partnership agreement.",
  },
  {
    number: "04",
    label: "Driver guidance",
    icon: "https://cdn.sanity.io/images/58hwvab6/production/e54412e0d9f48f235959d9d4d7d20bc83c465106-500x500.svg",
    alt: "Secure and collaborative logistics operations.",
  },
  {
    number: "05",
    label: "Inspection-ready records",
    icon: "https://cdn.sanity.io/images/58hwvab6/production/5f9e31bce39b6eb0b86ef36f417ab711852ed8cc-500x500.png",
    alt: "Protected freight documentation and compliance.",
  },
];

function ChevronRight() {
  return (
    <div className="hidden lg:flex items-center justify-center w-8 shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F68520"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </div>
  );
}

function HowItWorks() {
  return (
    <section
      className="bg-brand-sand py-16 md:py-20 lg:py-28"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-navy mb-4">
            How ODC works in practice?
          </h2>

          <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
            The platform reviews work before allocation so drivers, operators and
            safety teams can see whether a job is realistic and compliant.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:flex lg:items-stretch lg:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="flex items-stretch lg:flex-1 lg:min-w-0"
            >
              <div className="flex-1 relative border border-brand-border rounded-2xl p-6 md:p-7 flex flex-col items-center text-center bg-white transition-all duration-300 hover:shadow-lg hover:border-brand-orange/30">
                <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-brand-orange"></div>

                <div className="inline-flex items-center gap-1.5 bg-brand-navy/5 rounded-full px-3 py-1 mb-5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange"></span>

                  <span className="text-xs font-semibold text-brand-navy tracking-wide uppercase">
                    Step {step.number}
                  </span>
                </div>

                <div className="w-20 h-20 rounded-2xl bg-brand-sand flex items-center justify-center mb-5">
                  <img
                    src={step.icon}
                    alt={step.alt}
                    width="44"
                    height="44"
                    className="shrink-0"
                  />
                </div>

                <span className="text-brand-navy font-semibold text-sm leading-snug">
                  {step.label}
                </span>
              </div>

              {i < steps.length - 1 && <ChevronRight />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;