function StackedDiamonds() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M32 6L52 26L32 46L12 26L32 6Z"
        stroke="#F68520"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M32 14L46 26L32 38L18 26L32 14Z"
        stroke="#F68520"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M32 22L40 26L32 30L24 26L32 22Z"
        fill="#F68520"
      />
    </svg>
  );
}

import workerImg from "../assets/hero.png";
import img22 from "../assets/img22.webp";

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

export default function UpstreamApproach() {
  return (
    <>
      <section className="bg-white py-16 md:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-8 mb-16 lg:mb-24 items-stretch">
            
            {/* Left Column - Dashboard Image */}
            <div className="bg-[#f5f5f5] rounded-2xl overflow-hidden flex items-center justify-center p-4 md:p-8">
              <img 
                src={img22} 
                alt="Compliance Risk Dashboard UI" 
                className="w-full h-auto object-contain shadow-sm rounded-lg"
              />
            </div>

            {/* Right Column - Navy Card */}
            <div className="bg-[#1C3553] rounded-2xl flex flex-col items-center justify-center text-center px-8 py-12 lg:py-16">
              <div className="mb-6">
                <StackedDiamonds />
              </div>

              <h2
                className="text-2xl md:text-3xl lg:text-[2.1rem] font-serif text-white mb-4 max-w-[280px] leading-snug"
              >
                An Upstream Approach to risk
              </h2>

              <p className="text-[#a1b0c0] text-base md:text-[16px] mb-10">
                Operational decisions, supported in real time
              </p>

              <button
                type="button"
                className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:border-[#F68520] hover:text-[#F68520] transition-colors cursor-pointer shrink-0"
                aria-label="Scroll down"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </button>
            </div>
            
          </div>

          {/* Bottom Quote Text */}
          <div className="max-w-4xl mx-auto">
            <blockquote
              className="text-[#1C3553] text-xl md:text-2xl lg:text-[28px] font-serif italic text-center leading-relaxed"
            >
              "As freight operations grow more complex, the difference between
              control and chaos increasingly comes down to the quality of the
              systems supporting everyday decisions."
            </blockquote>
          </div>

        </div>
      </section>

      {/* Practical Pillars Section appended here */}
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
    </>
  );
}