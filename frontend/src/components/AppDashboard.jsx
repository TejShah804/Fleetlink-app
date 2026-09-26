

function DiamondIcon() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="36"
        y="4"
        width="28"
        height="28"
        rx="3"
        transform="rotate(45 36 4)"
        stroke="#F68520"
        strokeWidth="2.5"
        fill="none"
      />
      <rect
        x="36"
        y="14"
        width="20"
        height="20"
        rx="2"
        transform="rotate(45 36 14)"
        stroke="#F68520"
        strokeWidth="2.5"
        fill="none"
      />
      <rect
        x="36"
        y="22"
        width="14"
        height="14"
        rx="1.5"
        transform="rotate(45 36 22)"
        stroke="#F68520"
        strokeWidth="2.5"
        fill="none"
      />
    </svg>
  );
}

const AppDashboard = () => {
  return (
    <section className="bg-white py-16 md:py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          
          {/* Dashboard Image */}
          <div className="lg:col-span-2">
            <div className="grid h-full gap-5">
              <div className="bg-white rounded-xl overflow-hidden shadow-md flex flex-col">
                <div className="flex-1 flex flex-col justify-end">
                  <img
                    src="https://cdn.sanity.io/images/58hwvab6/production/b43ca22e11891767c371c97d3d9adcd95d90907e-1920x1080.png"
                    alt="ODC Platform Dashboard"
                    className="object-contain w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Card */}
          <div className="flex">
            <div className="bg-brand-navy-mid rounded-xl flex flex-col items-center justify-center px-6 md:px-8 py-12 md:py-14 w-full">
              
              <div className="mb-8">
                <DiamondIcon />
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 38 38"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="19"
                      cy="19"
                      r="17"
                      stroke="#F68520"
                      strokeWidth="2"
                    />
                    <circle
                      cx="19"
                      cy="19"
                      r="11.5"
                      stroke="#F68520"
                      strokeWidth="1.5"
                    />
                    <circle cx="19" cy="4" r="2" fill="#F68520" />
                    <circle cx="19" cy="34" r="2" fill="#F68520" />
                    <circle cx="4" cy="19" r="2" fill="#F68520" />
                    <circle cx="34" cy="19" r="2" fill="#F68520" />
                  </svg>

                  <span className="text-white font-bold text-sm">ODC</span>
                </div>
              </div>

              <h3 className="text-white font-bold text-lg md:text-xl text-center leading-snug mb-3">
                Sertainty by ODC®
              </h3>

              <p className="text-white/60 text-sm text-center leading-relaxed">
                Purpose-built compliance intelligence for Australian freight
                operators. Know the risk before the job begins.
              </p>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AppDashboard;