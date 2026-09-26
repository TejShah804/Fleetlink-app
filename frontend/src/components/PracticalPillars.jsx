import workerImg from "../assets/hero.png";

function ShieldIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="12" fill="#EEF2F8" />
      <path
        d="M28 14L16 19v10c0 7 5.2 13.4 12 15 6.8-1.6 12-8 12-15V19L28 14z"
        stroke="#4A6FA5"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="12" fill="#EEF2F8" />
      <circle cx="28" cy="28" r="10" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <circle cx="28" cy="14" r="3" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <circle cx="28" cy="42" r="3" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <circle cx="14" cy="28" r="3" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <circle cx="42" cy="28" r="3" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <line x1="28" y1="17" x2="28" y2="18" stroke="#4A6FA5" strokeWidth="2" />
      <line x1="28" y1="38" x2="28" y2="39" stroke="#4A6FA5" strokeWidth="2" />
      <line x1="17" y1="28" x2="18" y2="28" stroke="#4A6FA5" strokeWidth="2" />
      <line x1="38" y1="28" x2="39" y2="28" stroke="#4A6FA5" strokeWidth="2" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="12" fill="#EEF2F8" />
      <rect
        x="17"
        y="16"
        width="22"
        height="26"
        rx="3"
        stroke="#4A6FA5"
        strokeWidth="2"
        fill="none"
      />
      <path d="M23 12h10v6H23z" stroke="#4A6FA5" strokeWidth="2" fill="none" />
      <line x1="22" y1="26" x2="34" y2="26" stroke="#4A6FA5" strokeWidth="1.5" />
      <line x1="22" y1="31" x2="34" y2="31" stroke="#4A6FA5" strokeWidth="1.5" />
      <line x1="22" y1="36" x2="30" y2="36" stroke="#4A6FA5" strokeWidth="1.5" />
    </svg>
  );
}

const pillars = [
  {
    Icon: ShieldIcon,
    label: "Practical",
    tagline: "Supports better decision",
    body: "It helps drivers and operators manage jobs, hours, and changes without extra steps or manual follow-up.",
  },
  {
    Icon: NetworkIcon,
    label: "Responsible",
    tagline: "Built for compliant operations",
    body: "Responsibility is defined, records hold up when checked, and operations remain workable over time.",
  },
  {
    Icon: ClipboardIcon,
    label: "Accurate",
    tagline: "Tracks work as it happens",
    body: "Records stay consistent, complete, and ready when reviewed, with responsibility sitting where the work is carried out.",
  },
];

function PracticalPillars() {
  return (
    <section>
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: "340px" }}
      >
        <img
          src={workerImg}
          alt="We're rebuilding how freight operations actually work"
          className="w-full h-full object-cover object-center absolute inset-0"
          style={{ minHeight: "340px" }}
        />

        <div className="absolute inset-0 bg-brand-navy/60"></div>

        <div className="relative z-10 flex items-center justify-center h-full min-h-[340px] px-6 py-16 md:py-24">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold italic text-white text-center leading-snug max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            We're rebuilding how freight operations actually work
          </h2>
        </div>
      </div>

      <div className="bg-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-14">
            {pillars.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-6">
                  <p.Icon />
                </div>

                <h3
                  className="text-brand-navy text-xl md:text-2xl font-bold italic mb-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {p.label}
                </h3>

                <p className="text-brand-navy text-sm font-bold mb-3">
                  {p.tagline}
                </p>

                <p className="text-brand-muted text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PracticalPillars;