import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Layout() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("mp-theme");
      if (stored === "light" || stored === "dark") return stored as "light" | "dark";
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    } catch (e) {
      return "dark";
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("mp-theme", theme);
    } catch (e) {
      // ignore storage errors
    }
  }, [theme]);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const location = useLocation();
  const isUsers = location.pathname.startsWith("/users");
  const isOrders = location.pathname.startsWith("/orders");
  const primaryTitle = isOrders ? "Orders" : isUsers ? "Customer" : "Dashboard";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className={theme === "dark" ? "min-h-screen bg-zinc-950 text-white" : "min-h-screen bg-white text-zinc-900"}>
      <header className="bg-transparent px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shadow-md">
              <span className="text-white font-semibold">MP</span>
            </div>
            <div>
              <div className="text-sm font-medium">MarketPorter</div>
              <div className="text-xs text-zinc-400">Admin</div>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div
              className="relative inline-block"
              ref={dropdownRef}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                setOpen(true);
              }}
              onMouseLeave={() => {
                closeTimeoutRef.current = window.setTimeout(() => {
                  setOpen(false);
                  closeTimeoutRef.current = null;
                }, 150);
              }}
            >
              <button
                className="text-lg font-semibold cursor-pointer inline-flex items-center gap-2 px-2 py-1"
                aria-haspopup="true"
                aria-expanded={open}
              >
                {primaryTitle}
                <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className={`absolute left-0 top-full mt-1 z-50 transition-opacity transition-transform duration-150 ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}>
                <div className={`flex flex-col rounded-md overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-white text-zinc-900 border border-zinc-100'}`}>
                  {[
                    { path: '/dashboard', label: 'Dashboard' },
                    { path: '/orders', label: 'Orders' },
                    { path: '/users', label: 'Customer' },
                  ].map((item) => (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        navigate && navigate(item.path);
                      }}
                      className={`text-sm font-medium block w-full truncate px-3 py-2 transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              className={
                `relative h-6 w-9 rounded-full transition-colors focus:outline-none flex items-center px-1 ${
                  theme === "dark" ? "bg-indigo-600" : "bg-zinc-200"
                }`
              }
            >
              <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-3" : "translate-x-0"}`} />
              <svg viewBox="0 0 24 24" className={`h-3 w-3 mr-1 ${theme === "dark" ? "text-indigo-50" : "text-zinc-500"}`} fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3v1" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 20v1" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.22 4.22l.7.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.36 18.36l.7.7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg viewBox="0 0 24 24" className={`h-3 w-3 ml-1 ${theme === "dark" ? "text-indigo-50" : "text-zinc-500"}`} fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <div className={theme === "dark" ? "text-sm text-zinc-300" : "text-sm text-zinc-800"}>{user?.email}</div>
              <button
                onClick={signOut}
                className={theme === "dark" ? "text-xs text-zinc-400 hover:text-red-400" : "text-xs text-zinc-500 hover:text-red-500"}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
