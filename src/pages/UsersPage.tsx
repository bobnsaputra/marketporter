import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("mp-theme");
      if (stored === "dark") return true;
      return document.documentElement.classList.contains("dark");
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    // placeholder: load users from Supabase in a later step
    setUsers([]);
  }, []);

  useEffect(() => {
    // observe changes to document.documentElement class to react to theme toggles
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? "border dark:border-zinc-800 bg-zinc-950" : "border border-zinc-100 bg-white"}`}>
          <div className={`px-4 py-3 ${isDark ? "border-b dark:border-zinc-800 bg-zinc-900" : "border-b border-zinc-100 bg-zinc-50"}`}>
            <div className="flex items-center justify-between">
              <div className="sr-only">Customers</div>
              <div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-900"}`}>Total: {users.length}</div>
            </div>
          </div>

          <div className="p-4">
                {users.length === 0 ? (
              <div className="text-center py-8">
                <div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-500"}`}>No customers yet. Imported customers will appear here.</div>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.map((u) => (
                  <li key={u.id} className="py-3 flex items-center justify-between">
                    <div className={`${isDark ? "text-sm text-zinc-100" : "text-sm text-zinc-900"}`}>{u.email}</div>
                    <div className={`${isDark ? "text-xs text-zinc-400" : "text-xs text-zinc-500"}`}>ID: {u.id}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
