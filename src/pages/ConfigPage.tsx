import { useEffect, useState } from 'react';

export default function ConfigPage() {
  const [rate, setRate] = useState<string>(() => localStorage.getItem('mp-rate') || '1500');
  const [slabFee, setSlabFee] = useState<string>(() => localStorage.getItem('mp-slab-fee') || '50000');

  useEffect(() => {
    localStorage.setItem('mp-rate', rate);
  }, [rate]);

  useEffect(() => {
    localStorage.setItem('mp-slab-fee', slabFee);
  }, [slabFee]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium mb-4">Settings</h2>
      <div className="max-w-sm">
        <label className="block text-sm font-medium mb-2">Exchange rate (1 JPY → IDR)</label>
        <input value={rate} onChange={(e) => setRate(e.target.value)} className="w-full rounded border px-3 py-2" />
        <p className="text-xs text-zinc-500 mt-2">Stored in localStorage key <strong>mp-rate</strong>. Use numeric value (e.g. 1500).</p>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Slab fee (IDR)</label>
          <input value={slabFee} onChange={(e) => setSlabFee(e.target.value)} className="w-full rounded border px-3 py-2" />
          <p className="text-xs text-zinc-500 mt-2">Stored in localStorage key <strong>mp-slab-fee</strong>. Use numeric value (e.g. 50000).</p>
        </div>
      </div>
    </div>
  );
}
