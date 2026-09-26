

function PlatformIntro() {
  return (
    <section className="bg-brand-sand pt-16 md:pt-24 pb-8 md:pb-10">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        
        {/* Intro Section */}
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 mb-16">
          
          {/* Orange Block */}
          <div className="w-full md:w-[320px] shrink-0 bg-[#F57025] flex flex-col text-center shadow-md">
            <div className="py-16 md:py-24 px-8 flex flex-col items-center justify-center flex-1">
              <span className="text-white font-bold text-[4.5rem] md:text-[5rem] leading-none mb-4 tracking-tight">
                0100
              </span>
              <p className="text-white text-[15px] font-medium leading-snug max-w-[200px]">
                Drivers and operators registered for pilot participation.
              </p>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 py-4 lg:py-6 relative z-10 flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl lg:text-[2.25rem] font-serif font-medium text-[#0B1B36] leading-snug mb-8">
              A platform built for safer, compliant road transport
            </h2>

            <div className="space-y-6 text-[#5E6D82] text-base lg:text-[17px] leading-relaxed">
              <p>
                Owner Driver Collective brings job allocation, duty records and
                compliance guidance into one operational system.
              </p>

              <p>
                By connecting allocation, driver records and regulatory oversight,
                the platform helps transport operators make informed decisions
                before work begins.
              </p>

              <p className="font-semibold text-[#0B1B36]">
                Built for real operations. Inspection-ready. Non-punitive by
                design.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default PlatformIntro;