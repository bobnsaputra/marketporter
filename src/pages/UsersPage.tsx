import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import CustomerModal from "@/components/CustomerModal";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; amount: number; description?: string; created_at?: string | null; user_id?: string | null };

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("mp-theme");
      if (stored === "dark") return true;
      return document.documentElement.classList.contains("dark");
    } catch (e) {
      return false;
    }
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, amount, description, created_at, user_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setUsers((data ?? []) as Customer[]);
      } catch (err) {
        console.error("Failed to load customers:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // debounce search input (250ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    // observe changes to document.documentElement class to react to theme toggles
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  async function handleSaveCustomer(data: Customer) {
    // persist to Supabase
    try {
      const payload = {
        id: data.id,
        name: data.name,
        amount: data.amount,
        description: data.description ?? null,
        created_at: new Date().toISOString(),
        user_id: (user as any)?.id ?? null,
      };
      const { error } = await supabase.from("customers").insert([payload]);
      if (error) {
        console.error("Supabase insert error:", error);
        // fallback to local state
        setUsers((s) => [data, ...s]);
      } else {
        setUsers((s) => [data, ...s]);
      }
    } catch (err) {
      console.error(err);
      setUsers((s) => [data, ...s]);
    }
  }

  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? "border dark:border-zinc-800 bg-zinc-950" : "border border-zinc-100 bg-white"}`}>
          <div className={`px-4 py-3 ${isDark ? "border-b dark:border-zinc-800 bg-zinc-900" : "border-b border-zinc-100 bg-zinc-50"}`}>
            <div className="flex items-center justify-between">
              <div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-900"}`}>Total: {users.length}</div>
              <div>
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transform transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add customer
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-96">
                  <svg className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or description..."
                    className={`w-full pl-10 pr-3 py-2 rounded-full border ${isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'} shadow-sm focus:outline-none`}
                  />
                </div>
              </div>
              <div className="text-sm text-zinc-500">Showing {users.length} total</div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-zinc-500">Loading customers…</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-500"}`}>No customers yet. Imported customers will appear here.</div>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users
                  .filter((u) => {
                    const q = debouncedQuery.trim().toLowerCase();
                    if (q && !(u.name.toLowerCase().includes(q) || (u.description || "").toLowerCase().includes(q))) return false;
                    return true;
                  })
                  .map((u) => (
                    <li key={u.id} className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className={`${isDark ? 'text-sm text-zinc-100' : 'text-sm text-zinc-900'} font-semibold`}>{u.name}</div>
                          {u.description && <div className={`${isDark ? 'text-xs text-zinc-300' : 'text-xs text-zinc-700'} mt-1`}>{u.description}</div>}
                          <div className="text-xs text-zinc-400 mt-2">Created: {u.created_at ? new Date(u.created_at).toLocaleString() : "—"} • User: {u.user_id ? u.user_id.slice(0, 8) : "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className={`${isDark ? "text-sm text-zinc-100" : "text-sm text-zinc-900"} font-medium`}>Rp {Number(u.amount).toLocaleString("id-ID")}</div>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <CustomerModal open={adding} onClose={() => setAdding(false)} onSave={handleSaveCustomer} isDark={isDark} />
    </div>
  );
}
