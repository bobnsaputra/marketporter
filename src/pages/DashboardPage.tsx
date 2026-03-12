import { useEffect, useState } from "react";
import LinkBulkInput from "@/components/LinkBulkInput";
import Select from "@/components/Select";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; rate?: number };

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase.from("customers").select("id, name, rate").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        if (!mounted) return;
        setCustomers((data ?? []) as Customer[]);
        if ((data ?? []).length > 0) setSelectedCustomer((data as any)[0].id);
      } catch (err) {
        console.error("Failed to load customers:", err);
      }
    }
    load();
    // load current user id for association
    (async () => {
      try {
        if (supabase?.auth?.getUser) {
          const res = await supabase.auth.getUser();
          setCurrentUserId((res?.data as any)?.user?.id ?? null);
        } else if ((supabase.auth as any)?.user && typeof (supabase.auth as any).user === 'function') {
          const u = (supabase.auth as any).user();
          setCurrentUserId(u?.id ?? null);
        }
      } catch (e) {
        console.warn('Failed to get current user id', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function handleSaveLinks(links: string[]) {
    // include selected customer context
    console.log("Saving links for customer:", selectedCustomer, links);
    // TODO: wire to create orders or queue saver with customer id
  }

  const detectedRight = (
    <Select
      value={selectedCustomer ?? ""}
      onChange={(v) => setSelectedCustomer(v || null)}
      options={[{ value: "", label: "Unassigned" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
    />
  );

  return (
    <div>
      <div className="mt-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-medium">Bulk saves</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Paste a list of product links to save orders in bulk.</p>
        <LinkBulkInput currentUserId={currentUserId ?? undefined} customerId={selectedCustomer ?? undefined} onSave={handleSaveLinks} detectedRight={detectedRight} customerRate={customers.find((c) => c.id === selectedCustomer)?.rate} />
      </div>
    </div>
  );
}
