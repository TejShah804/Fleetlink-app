import img21 from "../assets/img21.webp";

export default function IndustryReality() {
  return (
    <section className="bg-white py-16 md:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          <div className="w-full lg:w-1/2 space-y-6 md:space-y-8 lg:pr-8">
            <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-serif font-semibold text-[#0B1B36] leading-snug">
              Industry Reality
            </h2>
            
            <div className="space-y-5 text-gray-600 font-medium text-base lg:text-lg leading-relaxed">
              <p>
                Work is often allocated without a clear view of compliance impact.
              </p>
              <p>
                Drivers and operators are then left dealing with problems once the job is already underway.
              </p>
              <p>
                As freight operations become more complex, the systems used to plan and manage work matter more than ever.
              </p>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2">
            <img 
              src={img21} 
              alt="Freight depot at night" 
              className="w-full h-auto rounded-3xl shadow-xl object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
