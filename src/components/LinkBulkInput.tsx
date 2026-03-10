import { useEffect, useState } from "react";

export default function LinkBulkInput({ onImport }: { onImport?: (links: string[]) => void }) {
  const [text, setText] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    function update() {
      setIsDark(document?.documentElement?.classList.contains("dark") ?? false);
    }
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  function parseLinks(input: string) {
    // Split by newlines or whitespace, filter out empty strings
    return input
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const links = parseLinks(text);

  function handleImport() {
    const parsed = parseLinks(text);
    if (onImport) onImport(parsed);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    // Allow default paste then normalize state (we'll append)
    setText((prev) => (prev ? prev + "\n" + pasted : pasted));
    e.preventDefault();
  }

  return (
    <section className={`mt-6 rounded-2xl p-6 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white shadow-sm border border-zinc-100'}`}>
      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Paste links (one per line)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        rows={6}
        className={`w-full rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDark ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600' : 'bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-500'}`}
        placeholder={"https://jp.mercari.com/item/123\nhttps://jp.mercari.com/item/456"}
      />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Detected: <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{links.length}</span></div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(text || links.join("\n")); }}
            className={`text-sm px-3 py-1 rounded-md ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-900'}`}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={links.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Import links
          </button>
        </div>
      </div>
    </section>
  );
}
