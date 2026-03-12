import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function formatShort(dt?: string) {
  if (!dt) return '';
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function OrdersPage() {
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [customersList, setCustomersList] = useState<Array<{id: string; name: string}>>([]);
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('any');
  const [customerQuery, setCustomerQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkStatus, setBulkStatus] = useState<string>('processed');
  const [isDark, setIsDark] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setIsDark(document?.documentElement?.classList.contains('dark') ?? false);
    }
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  // fetch customers list for filter dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: custs, error: cErr } = await supabase.from('customers').select('id,name').order('name');
        if (cErr) {
          console.warn('Failed to fetch customers list', cErr);
        } else if (mounted) {
          setCustomersList(Array.isArray(custs) ? custs : []);
          const map: Record<string, string> = {};
          (custs ?? []).forEach((c: any) => { map[c.id] = c.name; });
          setCustomers(map);
        }
      } catch (e) {
        console.warn('Exception fetching customers', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // load orders and apply filters whenever filters change
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let q: any = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500);

        if (filterCustomerId && filterCustomerId !== 'all') {
          q = q.eq('customer_id', filterCustomerId);
        }

        // compute lower bound for time filter
        if (timeFilter && timeFilter !== 'any') {
          const now = new Date();
          let lower: Date | null = null;
          if (timeFilter === 'today') {
            const d = new Date(now);
            d.setHours(0,0,0,0);
            lower = d;
          } else if (timeFilter === 'this_week') {
            const d = new Date(now);
            const dow = d.getDay(); // 0..6 (Sun..Sat)
            d.setDate(d.getDate() - dow);
            d.setHours(0,0,0,0);
            lower = d;
          } else if (timeFilter === 'this_month') {
            const d = new Date(now.getFullYear(), now.getMonth(), 1);
            lower = d;
          } else if (timeFilter.endsWith('h')) {
            const hours = Number(timeFilter.replace('h','')) || 0;
            const d = new Date(now.getTime() - hours * 60 * 60 * 1000);
            lower = d;
          }
          if (lower) {
            q = q.gte('created_at', lower.toISOString());
          }
        }

        const { data: rows, error: ordersError } = await q;
        if (ordersError) throw ordersError;
        if (!mounted) return;
        const r = rows ?? [];

        const g: Record<string, any[]> = {};
        r.forEach((row: any) => {
          const key = `${row.customer_id ?? row.user_id ?? 'unknown'}|${row.created_at ?? ''}`;
          (g[key] ||= []).push(row);
        });
        if (mounted) setGroups(g);
      } catch (e: any) {
        console.error('Failed to load orders from supabase', e);
        if (mounted) setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [filterCustomerId, timeFilter]);

  const keys = Object.keys(groups).sort((a, b) => (groups[b]?.[0]?.created_at ?? '').localeCompare(groups[a]?.[0]?.created_at ?? ''));

  return (
    <div className="mt-6 max-w-4xl mx-auto">
      <h3 className="text-lg font-medium">Orders</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Orders fetched from Supabase, grouped by customer and creation time.</p>

      <div className="mt-4 space-y-6">
        {loading && <div className="text-sm text-zinc-500">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && keys.length === 0 && <div className="text-sm text-zinc-500">No orders found.</div>}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 relative">
            <div className="text-sm">Customer:</div>
            <div className="relative">
              <input
                value={filterCustomerId === 'all' ? customerQuery : (customers[filterCustomerId] || customerQuery)}
                onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customers"
                className="text-sm rounded border px-3 py-1 w-48"
              />
              {showCustomerDropdown && (
                <div className="absolute z-40 mt-1 w-56 max-h-48 overflow-auto rounded border bg-white text-sm shadow-lg">
                  <div className={`px-2 py-1 cursor-pointer hover:bg-zinc-100 ${filterCustomerId === 'all' ? 'font-semibold' : ''}`} onMouseDown={() => { setFilterCustomerId('all'); setCustomerQuery(''); setShowCustomerDropdown(false); }}>All customers</div>
                  {customersList.filter(c => !customerQuery || c.name?.toLowerCase().includes(customerQuery.toLowerCase()) || c.id.includes(customerQuery)).slice(0,50).map(c => (
                    <div key={c.id} className={`px-2 py-1 cursor-pointer hover:bg-zinc-100 ${filterCustomerId === c.id ? 'font-semibold' : ''}`} onMouseDown={() => { setFilterCustomerId(c.id); setCustomerQuery(''); setShowCustomerDropdown(false); }}>{c.name || c.id}</div>
                  ))}
                  {customersList.length === 0 && <div className="px-2 py-1 text-zinc-500">No customers</div>}
                </div>
              )}
            </div>

            <div className="text-sm">Time:</div>
            <div className="flex items-center gap-1">
              {[
                ['any','Any'],
                ['today','Day'],
                ['this_week','Week'],
                ['this_month','Month'],
                ['2h','2h'],
                ['4h','4h'],
                ['6h','6h'],
              ].map(([val, label]) => (
                <button key={String(val)} onClick={() => setTimeFilter(String(val))} className={`text-xs px-2 py-1 rounded ${timeFilter===val ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-800'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(selectedIds).filter((k) => selectedIds[k]).length > 0 && (
              <>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="text-sm rounded border px-2 py-1">
                  <option value="pending">pending</option>
                  <option value="processed">processed</option>
                  <option value="shipped">shipped</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <button
                  onClick={async () => {
                    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
                    if (ids.length === 0) return;
                    try {
                      setLoading(true);
                      const idsArr = ids.map(String);
                      const { data: updatedRows, error: upErr } = await supabase.from('orders').update({ status: bulkStatus }).in('id', idsArr).select();
                      if (upErr) throw upErr;
                      // update local state using returned rows when available; fall back to ids if none returned
                      const updatedIdSet = new Set(((updatedRows && Array.isArray(updatedRows) && updatedRows.length > 0) ? updatedRows.map((r: any) => String(r.id)) : idsArr).map(String));
                      // if supabase returned zero rows and there was no error, warn the user (possible RLS/permission)
                      if ((!updatedRows || (Array.isArray(updatedRows) && updatedRows.length === 0))) {
                        const msg = `Update completed but returned no rows for ids: ${idsArr.join(', ')}. This may be due to Row Level Security or insufficient permissions; refresh may not show changes.`;
                        console.warn(msg);
                        setError(msg);
                      }
                      setGroups((prev) => {
                        const out: Record<string, any[]> = {};
                        Object.entries(prev).forEach(([gk, arr]) => {
                          out[gk] = arr.map((r) => updatedIdSet.has(String(r.id)) ? { ...r, status: bulkStatus } : r);
                        });
                        return out;
                      });
                      setSelectedIds({});
                    } catch (e: any) {
                      console.error('Bulk status update failed', e);
                      setError(String(e?.message || e?.details || e));
                    } finally { setLoading(false); }
                  }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                >Set status</button>
              </>
            )}
          </div>
        </div>

        {keys.map((key) => {
          const [customerId] = key.split('|');
          const items = groups[key];
          const createdAt = items[0]?.created_at ?? '';
          const customerName = (customerId && customers[customerId]) ? customers[customerId] : (customerId === 'unknown' ? 'Unassigned' : customerId);
          const total = items.reduce((acc: number, it: any) => acc + (Number(it.price_idr) || 0), 0);
          return (
            <div key={key}>
              <div className="text-sm font-semibold mb-2">Customer: {customerName}</div>
              <div className="space-y-3">
                <div className={`border rounded-md p-3 ${isDark ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">Created: {formatShort(createdAt)}</div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" aria-label="Select all" checked={items.every((it:any)=> !!selectedIds[it.id])} onChange={(e)=>{
                        const checked = !!e.target.checked;
                        setSelectedIds((s) => {
                          const out = { ...s };
                          items.forEach((it:any)=> { out[it.id] = checked; });
                          return out;
                        });
                      }} />
                      <div className="text-xs text-zinc-500">{items.length} items • Total: Rp {total.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {items.map((it: any, idx: number) => (
                      <div key={it.id ?? idx} className="flex items-center gap-3">
                        <a href={it.link} target="_blank" rel="noreferrer" className={`flex-1 ${isDark ? 'text-indigo-300' : 'text-indigo-600'} truncate`}>{it.link}</a>
                        <div className="w-28 text-right">{it.price_jpy ?? '—'}</div>
                        <div className="w-36 text-right">{it.price_idr ? `Rp ${it.price_idr.toLocaleString('id-ID')}` : '—'}</div>
                        <div className="w-40 text-right flex items-center gap-2">
                          <input type="checkbox" checked={!!selectedIds[it.id]} onChange={(e) => setSelectedIds((s) => ({ ...s, [it.id]: !!e.target.checked }))} />
                          {editingStatusId === it.id ? (
                            <select value={it.status ?? 'pending'} onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                setLoading(true);
                                const { data: upd, error: upErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', it.id).select();
                                if (upErr) throw upErr;
                                // use returned row if available
                                const updatedId = (upd && Array.isArray(upd) && upd[0]?.id) ? String(upd[0].id) : String(it.id);
                                if (!upd || (Array.isArray(upd) && upd.length === 0)) {
                                  const msg = `Update completed but returned no rows for id: ${it.id}. This may be due to Row Level Security or insufficient permissions.`;
                                  console.warn(msg);
                                  setError(msg);
                                }
                                setGroups((prev) => {
                                  const out: Record<string, any[]> = {};
                                  Object.entries(prev).forEach(([gk, arr]) => { out[gk] = arr.map((r) => String(r.id) === updatedId ? { ...r, status: newStatus } : r); });
                                  return out;
                                });
                                setEditingStatusId(null);
                              } catch (err: any) {
                                console.error('Failed to update status', err);
                                setError(String(err?.message || err?.details || err));
                              } finally { setLoading(false); }
                            }} onBlur={() => setEditingStatusId(null)} className="text-sm rounded border px-2 py-1">
                              <option value="pending">pending</option>
                              <option value="processed">processed</option>
                              <option value="shipped">shipped</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          ) : (
                            <div onClick={() => setEditingStatusId(it.id)} className={`cursor-pointer text-xs px-2 py-1 rounded ${it.status === 'processed' ? 'bg-emerald-600 text-white' : it.status === 'shipped' ? 'bg-blue-600 text-white' : it.status === 'cancelled' ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-800'}`}>{it.status ?? 'pending'}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
