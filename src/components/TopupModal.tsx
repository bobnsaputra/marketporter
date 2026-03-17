import React, { useEffect, useState } from "react";

export default function TopupModal({ open, onClose, onSave, customerId, customerName, customers, isDark }: { open: boolean; onClose: () => void; onSave: (payload: { customerId: string; amount: number }) => Promise<void> | void; customerId?: string; customerName?: string; customers?: { id: string; name?: string }[]; isDark?: boolean }) {
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(customerId ?? customers?.[0]?.id);

  useEffect(() => {
    setSelectedCustomer(customerId ?? customers?.[0]?.id);
  }, [customerId, customers]);

  if (!open) return null;

  const resolvedCustomerName = customerName ?? customers?.find((c) => c.id === selectedCustomer)?.name ?? selectedCustomer ?? '—';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-50 w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-100'}`} role="dialog" aria-modal>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3 10a7 7 0 1114 0 7 7 0 01-14 0zm8-1V6a1 1 0 10-2 0v3H6a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold">Add Topup</div>
              <div className="text-xxs text-zinc-400">Customer: <span className="font-medium">{resolvedCustomerName}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {!customerId && (
          <div className="mb-4">
            <label className="block text-xs mb-2">Choose customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none ${isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'}`}
            >
              <option value="">— Select customer —</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs mb-2">Amount (IDR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rp</span>
            <input
              autoFocus
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.-]/g, ''))}
              placeholder="e.g. 100000"
              aria-label="Amount in IDR"
              className={`w-full rounded-lg pl-10 pr-4 py-3 text-sm shadow-sm focus:shadow-outline placeholder:text-zinc-400 ${isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg border ${isDark ? 'border-zinc-700 text-zinc-200 bg-transparent' : 'border-zinc-200 text-zinc-700 bg-white'} hover:shadow-sm`}>Cancel</button>
          <button
            onClick={async () => {
              const v = Number(amount) || 0;
              if (v <= 0) return;
              if (!selectedCustomer) return;
              try {
                setSaving(true);
                await onSave({ customerId: selectedCustomer, amount: v });
              } finally {
                setSaving(false);
                setAmount('');
                onClose();
              }
            }}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white bg-gradient-to-br from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md transform hover:-translate-y-0.5`}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
