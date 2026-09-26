export default function ThePlatform() {
  return (
    <section
      className="bg-brand-sand py-16 md:py-20 lg:py-28"
      id="safety-ewd"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          
          <div className="order-2 lg:order-1">
            <img
              src="https://cdn.sanity.io/images/58hwvab6/production/50137d6954a24b7b2c90f847d6c76f0ca3ae6b4a-1920x1080.png"
              alt="Digital data infrastructure powering smart freight networks."
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-navy mb-6 md:mb-8">
              The Platform
            </h2>

            <p className="text-brand-muted text-base lg:text-lg leading-relaxed mb-4">
              Owner Driver Collective connects allocation, driver records and
              compliance guidance in one place.
            </p>

            <p className="text-brand-muted text-base lg:text-lg leading-relaxed mb-4">
              Work can be reviewed before allocation so hours, operational
              constraints and compliance risks are understood early.
            </p>

            <p className="text-brand-muted text-base lg:text-lg leading-relaxed mb-4">
              This helps drivers, operators and safety teams make better
              decisions before a job begins.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}