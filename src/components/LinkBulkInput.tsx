import React, { useEffect, useState } from "react";

export default function LinkBulkInput({ onImport, detectedRight }: { onImport?: (links: string[]) => void; detectedRight?: React.ReactNode }) {
  const [text, setText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  // Ensure the detectedRight node adapts to the current theme by cloning it with theme classes when it's a React element
  const renderDetectedRight = (() => {
    if (!detectedRight) return null;
    if (React.isValidElement(detectedRight)) {
      const themeClass = isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200';
      return React.cloneElement(detectedRight as React.ReactElement, { className: themeClass } as any);
    }
    return detectedRight;
  })();

  useEffect(() => {
    function update() {
      setIsDark(document?.documentElement?.classList.contains("dark") ?? false);
    }
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  function isValidHttpUrl(s: string) {
    try {
      const u = new URL(s);
      return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
    } catch (e) {
      return false;
    }
  }

  function parseLinks(input: string) {
    // Split by newlines, validate each line is a full http(s) URL (e.g. https://example.com/path)
    return input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((line) => isValidHttpUrl(line));
  }

  const links = parseLinks(text);
  const allLines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const invalidLines = allLines.filter((l) => !isValidHttpUrl(l));

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

  function autoPrependHttps() {
    const newLines = text.split(/\r?\n/).map((line) => {
      const t = line.trim();
      if (!t) return t;
      if (isValidHttpUrl(t)) return t;
      if (!/^https?:\/\//i.test(t) && t.includes('.') && !t.includes(' ')) {
        return 'https://' + t;
      }
      return t;
    });
    setText(newLines.join('\n'));
    setShowInvalid(false);
  }

  function removeInvalidLine(idx: number) {
    const lines = text.split(/\r?\n/);
    let count = -1;
    const kept = lines.filter((ln) => {
      if (!ln.trim()) return false;
      if (!isValidHttpUrl(ln.trim())) {
        count++;
        return count !== idx;
      }
      return true;
    });
    setText(kept.join('\n'));
  }

  return (
    <section className={`mt-6 rounded-2xl p-6 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white shadow-sm border border-zinc-100'}`}>
      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Paste full http(s) links (one per line)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        rows={6}
        className={`w-full rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDark ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600' : 'bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-500'}`}
        placeholder={"https://jp.mercari.com/item/123\nhttps://jp.mercari.com/item/456"}
      />

      <div className="mt-4 flex items-center gap-4">
        <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Detected: <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{links.length}</span>
        </div>

        <div className="flex-1 flex justify-center">
          {renderDetectedRight ? (
            <div className="w-52">
              {renderDetectedRight}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {invalidLines.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInvalid((s) => !s)}
                className={`text-sm px-3 py-1 rounded-md border ${isDark ? 'border-zinc-700 text-zinc-200 bg-zinc-800' : 'border-zinc-200 text-zinc-800 bg-white'}`}
              >
                Invalid: {invalidLines.length}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(text || links.join("\n")); }}
            className={`text-sm px-3 py-1 rounded-md transition ${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={links.length === 0}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            Import links
          </button>
        </div>
      </div>

      {showInvalid && invalidLines.length > 0 && (
        <div className={`mt-3 rounded-md p-3 border ${isDark ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-100 bg-white text-zinc-900'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Invalid lines ({invalidLines.length})</div>
            <div className="flex items-center gap-2">
              <button onClick={autoPrependHttps} className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white">Auto-prepend https://</button>
              <button onClick={() => setShowInvalid(false)} className={`text-sm px-3 py-1 rounded-md ${isDark ? 'border border-zinc-700 text-zinc-300' : 'border border-zinc-200 text-zinc-700'}`}>Close</button>
            </div>
          </div>
          <ul className="text-sm space-y-2 max-h-40 overflow-auto">
            {invalidLines.map((l, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <div className="truncate pr-4">{l}</div>
                <button onClick={() => removeInvalidLine(idx)} className="text-xs text-red-500">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
