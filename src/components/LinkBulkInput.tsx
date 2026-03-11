import React, { useEffect, useState, useMemo } from "react";

export default function LinkBulkInput({ onImport, detectedRight, customerRate }: { onImport?: (links: string[]) => void; detectedRight?: React.ReactNode; customerRate?: number }) {
  const [text, setText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  // Ensure the detectedRight node adapts to the current theme by cloning it and merging className when it's a React element
  const renderDetectedRight = (() => {
    if (!detectedRight) return null;
    if (React.isValidElement(detectedRight)) {
      const themeClass = isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200';
      const existing = (detectedRight as any).props?.className || "";
      const merged = [existing, themeClass].filter(Boolean).join(' ');
      return React.cloneElement(detectedRight as React.ReactElement, { className: merged } as any);
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

  const links = useMemo(() => parseLinks(text), [text]);
  const allLines = useMemo(() => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean), [text]);
  const invalidLines = useMemo(() => allLines.filter((l) => !isValidHttpUrl(l)), [allLines]);

  // previews are no longer enriched; we only use the raw links as the preview

  // no-op: previews aren't fetched/enriched anymore; the UI uses `links` directly

  // No automatic preview fetching: scraping third-party pages is disabled

  function handleImport() {
    const toImport = links;
    if (onImport) onImport(toImport);
    const ev = new CustomEvent('linkbulk:import', { detail: toImport });
    window.dispatchEvent(ev);
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

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Detected: <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{links.length}</span>
          </div>

          {/* desktop: show selector centered; mobile: hidden (shown below) */}
          <div className="hidden sm:block flex-shrink-0 w-56">
            {renderDetectedRight && <div className="w-full">{renderDetectedRight}</div>}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <div className={`w-36 ${isDark ? 'text-zinc-300' : 'text-zinc-600'} text-sm`}>
            {typeof customerRate === 'number' ? (
              <>Rate: <span className="font-medium">{customerRate}</span></>
            ) : (
              <div aria-hidden className="invisible">placeholder</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invalidLines.length > 0 && (
              <button
                type="button"
                onClick={() => setShowInvalid((s) => !s)}
                className={`text-sm px-3 py-1 rounded-md border ${isDark ? 'border-zinc-700 text-zinc-200 bg-zinc-800' : 'border-zinc-200 text-zinc-800 bg-white'}`}
              >
                Invalid: {invalidLines.length}
              </button>
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

        {/* mobile: show selector underneath to avoid crowding */}
        {renderDetectedRight && (
          <div className="sm:hidden mt-2">
            {renderDetectedRight}
          </div>
        )}
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

      {links.length > 0 && (
        <div className={`mt-4 rounded-md p-3 border ${isDark ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-100 bg-white text-zinc-900'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Previews</div>
            <div className="text-xs text-zinc-500">Detected links to import</div>
          </div>
          <div className="overflow-auto max-h-48">
            <ul className="space-y-2 text-sm">
              {links.map((l) => (
                <li key={l} className="truncate">
                  <a href={l} target="_blank" rel="noreferrer" className={`${isDark ? 'text-white hover:underline' : 'text-indigo-600 hover:underline'}`}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleImport}
          disabled={links.length === 0}
          className={`rounded-md px-5 py-2 text-sm font-semibold text-white shadow ${isDark ? 'bg-green-500 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          Confirm
        </button>
      </div>
    </section>
  );
}
