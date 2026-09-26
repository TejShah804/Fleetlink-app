

const BetterWayCTA = ({ onOpenModal }) => {
  return (
    <section className="py-24 bg-brand-sand">
      <div className="max-w-4xl mx-auto px-6">
        <div className="relative py-16 px-8 md:py-20 md:px-16 text-center flex flex-col items-center justify-center">
          
          {/* Corner Borders */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-[1.5px] border-l-[1.5px] border-brand-orange rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-[1.5px] border-r-[1.5px] border-brand-orange rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[1.5px] border-l-[1.5px] border-brand-orange rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[1.5px] border-r-[1.5px] border-brand-orange rounded-br-2xl"></div>

          {/* Content */}
          <h2 className="text-3xl md:text-4xl font-serif text-brand-navy mb-4">
            A Better way to run Freight Operations!
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto mb-8 text-sm md:text-base">
            Learn how Owner Driver Collective brings planning, records and compliance into<br className="hidden md:block" /> one operational view.
          </p>
          <button 
            onClick={onOpenModal}
            className="bg-brand-navy text-white px-8 py-3.5 rounded-lg text-sm font-medium hover:bg-brand-navy-mid transition-colors duration-300"
          >
            Register your Interest
          </button>
        </div>
      </div>
    </section>
  );
};

export default BetterWayCTA;
