function Hero({ onOpenModal }) {
  return (
    <section className="relative h-[55vh] md:h-[50vh] flex items-center justify-center overflow-hidden">
      <img
        src="https://cdn.sanity.io/images/58hwvab6/production/cae56706bf0d9ff33b3c841b620d1e0a1e2c8371-1920x1080.png"
        alt="Multiple freight trucks transporting shipping containers along a multi-lane highway"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/30"></div>

      <div className="relative z-10 text-center text-white w-full px-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.4rem] font-bold leading-tight mt-16 mb-4 md:mb-6 max-w-3xl mx-auto">
          We're rebuilding how freight operations actually work.
        </h1>

        <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed mb-8 md:mb-10 max-w-xl mx-auto">
          A safety and compliance-driven freight network powered by Sertainty by
          ODC®
        </p>

        <div className="flex justify-center">
          <button 
            onClick={onOpenModal}
            className="px-8 sm:px-12 md:px-20 py-3 md:py-4 border-2 border-white text-white text-sm md:text-base font-medium tracking-wide hover:bg-white hover:text-brand-navy transition-colors duration-200 cursor-pointer"
          >
            Register your Interest
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;