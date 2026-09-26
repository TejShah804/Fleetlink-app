

const About = () => {
  return (
    <section className="bg-white py-16 md:py-20 lg:py-28" id="about">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 items-center lg:grid-cols-2 lg:gap-16">
          
          {/* Left Content */}
          <div>
            <div className="mb-6 md:mb-8">
              <span className="inline-block w-10 h-1 bg-brand-orange rounded-full mb-4"></span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-navy">
                About — Owner Driver Collective
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
                Owner Driver Collective was created in response to long-standing
                challenges in road transport. Work is often allocated without
                clear visibility of compliance impact, while responsibility for
                risk is pushed down the chain.
              </p>

              <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
                ODC supports responsible allocation, accurate records and
                clearer oversight so safety and compliance become part of
                everyday operations.
              </p>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative overflow-hidden lg:overflow-visible">
            <div className="hidden lg:block absolute -top-3 -right-3 w-full h-full border-2 border-brand-orange/30 rounded-2xl"></div>

            <img
              src="https://cdn.sanity.io/images/58hwvab6/production/c4d725e8e1aa947c84df09f30f73365a3ccff21f-1536x1024.png"
              alt="Commercial truck driver operating vehicle with in-cab monitoring and logistics systems."
              className="relative object-cover rounded-2xl w-full h-auto shadow-lg"
            />
          </div>
        </div>

        {/* Founder Section */}
        <div className="mt-14 lg:mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-start">
            
            <div className="flex items-start gap-5 lg:max-w-sm">
              <span className="shrink-0 w-1.5 self-stretch bg-brand-orange rounded-full"></span>

              <h3 className="text-xl md:text-2xl lg:text-[1.7rem] font-bold text-brand-navy leading-snug">
                Built by someone who's lived the job.
              </h3>
            </div>

            <div className="space-y-3 lg:pt-1">
              <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
                Owner Driver Collective was founded by Brad Gilbert, a veteran
                transport operator with more than a decade of frontline
                experience in the Australian road freight industry.
              </p>

              <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
                Through years of working in the sector, Brad saw how
                disconnected systems, unclear responsibility and compliance
                pressure are often pushed onto individual drivers.
              </p>

              <p className="text-brand-muted text-base lg:text-lg leading-relaxed">
                ODC was created to address these structural problems and build a
                system that supports safer, clearer and more accountable freight
                operations.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default About;