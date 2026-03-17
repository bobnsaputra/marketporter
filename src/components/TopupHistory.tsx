import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TopupHistory({ customerId, isDark, onVoided, refreshKey }: { customerId?: string; isDark?: boolean; onVoided?: (topupId: string, amount: number) => void; refreshKey?: number }) {
  const [rows, setRows] = useState<Array<{ id: string; amount: number; created_at?: string; voided?: boolean; voided_at?: string; void_reason?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('topups').select('id,amount,created_at,voided,voided_at,void_reason').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      setRows(Array.isArray(data) ? data.map((r: any) => ({ id: String(r.id), amount: Number(r.amount), created_at: r.created_at, voided: !!r.voided, voided_at: r.voided_at, void_reason: r.void_reason })) : []);
    } catch (e: any) {
      console.warn('Failed to load topups (table may not exist):', e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [customerId, refreshKey]);

  if (!customerId) return null;

  async function handleVoid(id: string, amount: number) {
    const ok = window.confirm('Void this topup and deduct the amount from the customer balance?');
    if (!ok) return;
    const reason = window.prompt('Reason for voiding (optional):', '') || '';
    try {
      const authRes = await supabase.auth.getUser();
      const userId = authRes?.data?.user?.id ?? null;
      const rpc = await supabase.rpc('void_topup', { p_topup_id: id, p_actor: userId, p_reason: reason });
      if (rpc.error) {
        throw rpc.error;
      }
      setRows((s) => s.map((r) => r.id === id ? { ...r, voided: true, voided_at: new Date().toISOString(), void_reason: reason } : r));
      if (onVoided) onVoided(id, amount);
    } catch (e: any) {
      console.error('Failed to void topup:', e);
      window.alert('Failed to void topup: ' + (e?.message || String(e)));
    }
  }

  return (
    <div className={`px-4 pb-3 text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Topup History</div>
        <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${rows.length} entries`}</div>
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
      {rows.length === 0 && !loading ? (
        <div className="text-xs text-zinc-500">No topups recorded.</div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }} className="space-y-1">
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="truncate">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</div>
                  {r.voided && r.void_reason ? <div className="text-xxs text-red-500">Voided: {r.void_reason}</div> : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium">Rp {Number(r.amount).toLocaleString('id-ID')}</div>
                  {r.voided ? (
                    <div className="text-xxs text-zinc-500">Voided</div>
                  ) : (
                    <button className="text-xxs inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-sm" onClick={() => handleVoid(r.id, r.amount)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zM5 8a1 1 0 011 1v7a2 2 0 002 2h4a2 2 0 002-2V9a1 1 0 112 0v7a4 4 0 01-4 4H8a4 4 0 01-4-4V9a1 1 0 011-1z"/></svg>
                      Void
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
