const features = [
  {
    title: "Get work that's right for you",
    body: "Jobs are matched to your availability, hours and vehicle type — so you spend less time chasing work and more time on the road.",
  },
  {
    title: "Stay compliant without the guesswork",
    body: "Your hours, rest breaks and duty records are tracked in real time. ODC flags risks before they become breaches - not after.",
  },
  {
    title: "Make the job easier, not harder",
    body: "One place for job details, changes and records. No more chasing paperwork, phone calls or finding out mid-run that something doesn't add up.",
  },
];

function ForDrivers() {
  return (
    <section className="bg-brand-sand pt-4 md:pt-6 pb-16 md:pb-24">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        <div className="bg-white py-12 lg:py-16 px-8 md:px-12 lg:px-14 shadow-sm border-l-[3px] border-[#F57025] rounded-[4px]">
          <div className="mb-10 md:mb-12">
            <span className="block text-[#F57025] text-[11px] md:text-xs font-bold uppercase tracking-[0.15em] mb-4">
              FOR DRIVERS
            </span>

            <h2 className="text-2xl md:text-3xl lg:text-[2.25rem] font-serif text-[#0B1B36] leading-snug mb-5">
              Know the job before you accept the load.
            </h2>

            <p className="text-[#5E6D82] text-sm lg:text-[15px] leading-relaxed max-w-4xl">
              ODC shows whether work is safe, compliant and workable before it is accepted by an owner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col">
                <div className="h-[1px] bg-[#F57025]/30 w-full mb-6"></div>

                <div>
                  <h3 className="text-[#0B1B36] font-serif text-base md:text-[17px] leading-snug mb-3">
                    {f.title}
                  </h3>

                  <p className="text-[#5E6D82] text-sm lg:text-[15px] leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ForDrivers;