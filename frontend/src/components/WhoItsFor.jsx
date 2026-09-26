import { useState } from "react";

const items = [
  {
    title: "Drivers",
    content:
      "Manage work with clear visibility of hours, limits, and changes throughout the day.",
  },
  {
    title: "Fleet Operators",
    content:
      "Allocate and manage work with visibility of hours, constraints, and compliance as the day unfolds.",
  },
  {
    title: "Shippers",
    content:
      "Engage carriers with greater transparency over allocation, compliance exposure, and operational status.",
  },
  {
    title: "Compliance & Safety Teams",
    content:
      "Monitor work, records, and emerging risk with a clear operational view, not retrospective reporting.",
  },
];

export default function WhoItsFor() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      className="bg-brand-navy py-16 md:py-20 lg:py-28"
      id="who-its-for"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          
          {/* Left Content */}
          <div>
            <div className="mb-14 lg:mb-20">
              <span className="inline-block w-10 h-1 bg-brand-orange rounded-full mb-4" />
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                Who it's for?
              </h2>
            </div>

            <div className="space-y-0">
              {items.map((item, i) => {
                const isOpen = openIndex === i;

                return (
                  <div
                    key={item.title}
                    className={`border-l-2 transition-colors duration-200 ${
                      isOpen
                        ? "border-brand-orange"
                        : "border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex justify-between items-center w-full text-left py-4 px-5 group cursor-pointer"
                      onClick={() => setOpenIndex(i)}
                    >
                      <span
                        className={`text-base md:text-lg font-semibold transition-colors duration-200 ${
                          isOpen
                            ? "text-white"
                            : "text-white/60 group-hover:text-white/80"
                        }`}
                      >
                        {item.title}
                      </span>

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-5 h-5 shrink-0 ml-4 transition-all duration-200 ${
                          isOpen
                            ? "text-brand-orange rotate-180"
                            : "text-white/40 group-hover:text-white/60"
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-white/60 text-sm md:text-base leading-relaxed px-5 pb-5">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Image */}
          <div className="flex justify-center lg:justify-end lg:items-end h-full">
            <div className="relative">
              <div className="absolute -inset-4 bg-brand-orange/5 rounded-3xl blur-2xl" />

              <img
                src="https://cdn.sanity.io/images/58hwvab6/production/eb3a27374a77dd32e27b32d85271b849ead5215f-1536x1024.png"
                alt="Freight platform displaying multiple carrier options for shipment routing."
                className="relative object-contain w-full h-auto max-w-md lg:max-w-none rounded-2xl"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}