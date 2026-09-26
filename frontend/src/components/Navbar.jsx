import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LayoutDashboard, ChevronDown } from "lucide-react";

function OdcLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="19" cy="19" r="17" stroke="#F68520" strokeWidth="2" fill="none" />
        <circle cx="19" cy="19" r="11.5" stroke="#F68520" strokeWidth="1.5" fill="none" />
        <circle cx="19" cy="19" r="6" stroke="#F68520" strokeWidth="1.5" fill="none" />
        <circle cx="19" cy="3.5" r="2.5" fill="#F68520" />
        <circle cx="19" cy="34.5" r="2.5" fill="#F68520" />
        <circle cx="3.5" cy="19" r="2.5" fill="#F68520" />
        <circle cx="34.5" cy="19" r="2.5" fill="#F68520" />
      </svg>
      <div className="leading-tight">
        <div className="text-white font-bold text-sm tracking-tight">OwnerDriver</div>
        <div className="text-white/70 font-normal text-xs tracking-widest uppercase">Collective</div>
      </div>
    </div>
  );
}

function Navbar({ onOpenModal, onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout, isDriver, isOperator, isLoggedIn } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setDropdownOpen(false);
    if (dropdownOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  const links = [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#who-its-for", label: "Who it's for" },
    { href: "/#safety-ewd", label: "Safety & EWD" },
    { href: "/#about", label: "About ODC" },
  ];

  const dashboardHref = isDriver
    ? '/dashboard/driver'
    : isOperator
      ? '/dashboard/operator'
      : '/';

  const roleLabel = isDriver ? 'Owner Driver' : isOperator ? 'Fleet Operator' : '';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-brand-navy shadow-md py-3 lg:py-4" : "bg-transparent py-5 lg:py-6"}`}>
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-10">
        <a href="/" className="block">
          <OdcLogo />
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-white hover:text-brand-orange transition-colors">
              {l.label}
            </a>
          ))}

          {isLoggedIn ? (
            /* Logged-in user controls */
            <div className="flex items-center gap-3">
              {/* Dashboard Button */}
              <a
                href={dashboardHref}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </a>

              {/* User avatar dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-orange text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[110px] truncate">{user?.name}</span>
                  <ChevronDown size={14} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-left">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-brand-navy truncate">{user?.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-orange/10 text-brand-orange">
                        {roleLabel}
                      </span>
                    </div>
                    <a href={dashboardHref} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <LayoutDashboard size={14} />
                      My Dashboard
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Guest controls */
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center px-5 py-2 rounded-full border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={onOpenModal}
                className="inline-flex items-center px-5 py-2 rounded-full bg-brand-orange text-white text-sm font-semibold hover:bg-orange-500 transition-colors cursor-pointer"
              >
                Register Interest
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden text-white p-1 cursor-pointer z-[60] relative"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16" />
              <path d="M4 12h16" />
              <path d="M4 19h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-[45] lg:hidden transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 right-0 h-[100dvh] w-[280px] bg-brand-navy shadow-2xl z-[50] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col px-6 pt-24 pb-8 gap-6 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Mobile User Info */}
        {isLoggedIn && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20">
            <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-white/50 text-[11px] truncate">{roleLabel}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-lg font-medium text-white hover:text-brand-orange transition-colors border-b border-white/10 py-4" onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>

        {isLoggedIn ? (
          <div className="mt-auto flex flex-col gap-3">
            <a href={dashboardHref} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white/10 border border-white/30 text-white text-base font-semibold hover:bg-white/20 transition-colors" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={16} />
              My Dashboard
            </a>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-400 text-base font-semibold hover:bg-red-500/30 transition-colors">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-3">
            <button onClick={() => { onOpenLogin(); setMenuOpen(false); }} className="block w-full text-center px-5 py-3.5 rounded-full border border-white/40 text-white text-base font-semibold hover:bg-white/10 transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={() => { onOpenModal(); setMenuOpen(false); }} className="block w-full text-center px-5 py-3.5 rounded-full bg-brand-orange text-white text-base font-semibold hover:bg-orange-500 transition-colors cursor-pointer">
              Register Interest
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;