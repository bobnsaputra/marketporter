import { useEffect, useState } from "react";
import LinkBulkInput from "@/components/LinkBulkInput";
import Select from "@/components/Select";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string };

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase.from("customers").select("id, name").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        if (!mounted) return;
        setCustomers((data ?? []) as Customer[]);
        if ((data ?? []).length > 0) setSelectedCustomer((data as any)[0].id);
      } catch (err) {
        console.error("Failed to load customers:", err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function handleImportLinks(links: string[]) {
    // include selected customer context
    console.log("Importing links for customer:", selectedCustomer, links);
    // TODO: wire to create orders or queue scraper with customer id
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
        <h3 className="text-lg font-medium">Bulk import links</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Paste a list of product links to create orders in bulk.</p>
        <LinkBulkInput onImport={handleImportLinks} detectedRight={detectedRight} />
      </div>
    </div>
  );
}
