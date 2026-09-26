import { Phone, Mail } from 'lucide-react';

const Linkedin = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

const Facebook = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const Instagram = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-gray-100">
      {/* Header */}
    

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Column - Contact */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer group">
              <Phone className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
              <span className="text-sm text-gray-300 group-hover:text-gray-100">0414 017 759</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer group">
              <Mail className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
              <span className="text-sm text-gray-300 group-hover:text-gray-100">info@ownerdc.com.au</span>
            </div>
          </div>

          {/* Center Column - Navigation */}
          <div className="space-y-8">
            {/* Explore Section */}
            <div>
              <button className="px-4 py-2 border border-slate-500 rounded-lg text-white hover:border-slate-400 hover:bg-slate-800/50 transition-all mb-6">
                Explore
              </button>
              <nav className="space-y-3">
                <a href="#" className="block text-gray-400 hover:text-gray-200 transition-colors">How ODC Works</a>
                <a href="#" className="block text-gray-400 hover:text-gray-200 transition-colors">Who it's for</a>
                <a href="#" className="block text-gray-400 hover:text-gray-200 transition-colors">Safety & EWD</a>
              </nav>
            </div>

            {/* Company Section */}
            <div>
              <button className="px-4 py-2 border border-slate-500 rounded-lg text-white hover:border-slate-400 hover:bg-slate-800/50 transition-all mb-6">
                Company
              </button>
              <nav className="space-y-3">
                <a href="#" className="block text-gray-400 hover:text-gray-200 transition-colors">About ODC</a>
                <div className="flex items-center gap-2">
                  <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Insights & Updates</a>
                  <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full">coming soon</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Careers</a>
                  <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full">coming soon</span>
                </div>
              </nav>
            </div>
          </div>

          {/* Right Column - Resources */}
          <div>
            <button className="px-4 py-2 border border-slate-500 rounded-lg text-white hover:border-slate-400 hover:bg-slate-800/50 transition-all mb-6">
              Resources
            </button>
            <nav className="space-y-3">
              <div className="flex items-center gap-2">
                <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Documentation</a>
                <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full">soon</span>
              </div>
              <div className="flex items-center gap-2">
                <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">FAQs</a>
                <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full">soon</span>
              </div>
              <div className="flex items-center gap-2">
                <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Support</a>
                <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full">soon</span>
              </div>
            </nav>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-200 transition-colors">Privacy Policy</a>
            <span className="text-slate-600">|</span>
            <a href="#" className="hover:text-gray-200 transition-colors">Terms & Conditions</a>
          </div>
          <div className="flex gap-3">
            <a href="#" className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5 text-white" />
            </a>
            <a href="#" className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="Facebook">
              <Facebook className="w-5 h-5 text-white" />
            </a>
            <a href="#" className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="Instagram">
              <Instagram className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
