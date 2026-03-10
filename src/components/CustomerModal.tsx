import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { id: string; name: string; amount: number; description?: string }) => void;
  isDark?: boolean;
};

export default function CustomerModal({ open, onClose, onSave, isDark }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  function handleSave() {
    if (!name || !amount) return; // require name and amount
    const id = Date.now().toString(36);
    const num = Number(amount.toString().replace(/[^0-9.\-]/g, "")) || 0;
    onSave({ id, name, amount: num, description: description || undefined });
    // reset
    setName("");
    setAmount("");
    setDescription("");
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-70 w-full max-w-lg mx-auto transform rounded-2xl overflow-hidden transition-all duration-150 ${
          isDark
            ? "bg-zinc-900 text-white border border-zinc-800 shadow-2xl"
            : "bg-white text-zinc-900 border border-zinc-100 shadow-xl"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-semibold">Add Customer</h3>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>Record a transfer quickly</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4">
            <label className="block">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Taro Yamada"
                className={`mt-1 block w-full rounded-lg border border-zinc-200 bg-white/60 dark:bg-transparent px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-indigo-600 text-white' : 'focus:ring-indigo-200 text-zinc-900'}`}
              />
            </label>

            <label className="block">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>Amount transferred</span>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rp</span>
                <input
                  type="number"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`block w-full rounded-lg border border-zinc-200 bg-white/60 dark:bg-transparent px-10 py-2 shadow-sm focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-indigo-600 text-white' : 'focus:ring-indigo-200 text-zinc-900'}`}
                />
              </div>
            </label>

            <label className="block">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes"
                className={`mt-1 block w-full rounded-lg border border-zinc-200 bg-white/60 dark:bg-transparent px-3 py-2 min-h-[88px] shadow-sm focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-indigo-600 text-white' : 'focus:ring-indigo-200 text-zinc-900'}`}
              />
            </label>
          </div>
        </div>

        <div className="px-6 py-4 bg-transparent flex items-center justify-end gap-3 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 bg-white hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { handleSave(); onClose(); }}
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white text-sm font-medium shadow-md hover:from-indigo-700 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
