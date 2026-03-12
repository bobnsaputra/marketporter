import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactDOM from 'react-dom';

export default function LinkBulkInput({ onImport, detectedRight, customerRate }: { onImport?: (links: string[]) => void; detectedRight?: React.ReactNode; customerRate?: number }) {
  const [text, setText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [attemptedConfirm, setAttemptedConfirm] = useState(false);
  const [slabFee, setSlabFee] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('mp-slab-fee') || '50000') || 50000;
    } catch (e) {
      return 50000;
    }
  });
  const [slabEditing, setSlabEditing] = useState(false);
  const [slabEditValue, setSlabEditValue] = useState(String(slabFee));

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

  // per-link JPY price inputs
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [slabbed, setSlabbed] = useState<Record<string, boolean>>({});
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  function handlePriceChange(url: string, val: string) {
    setPrices((p) => ({ ...p, [url]: val }));
    setAttemptedConfirm(false);
  }

  function handleSlabToggle(url: string, v: boolean) {
    setSlabbed((s) => ({ ...s, [url]: v }));
    setAttemptedConfirm(false);
  }

  function handleTextChange(val: string) {
    setText(val);
    setAttemptedConfirm(false);
  }

  function calcIdrFor(url: string) {
    const jpy = prices[url];
    if (!jpy) return null;
    if (typeof customerRate !== 'number') return null;
    const n = Number(String(jpy).replace(/[¥,\s]/g, '')) || 0;
    const base = Math.round(n * customerRate);
    const slabFeeAmount = slabbed[url] ? slabFee : 0;
    return base + slabFeeAmount;
  }

  // previews are no longer enriched; we only use the raw links as the preview

  // no-op: previews aren't fetched/enriched anymore; the UI uses `links` directly

  // No automatic preview fetching: scraping third-party pages is disabled

  function handleImport() {
    setAttemptedConfirm(true);
    // prevent confirm if any JPY price missing
    const missing = links.filter((url) => !prices[url] || String(prices[url]).trim() === "");
    if (missing.length > 0) return;

    const enriched = links.map((url) => ({
      url,
      price_jpy: prices[url] ?? null,
      slabbed: !!slabbed[url],
      slab_fee_amount: slabbed[url] ? slabFee : 0,
      price_idr: calcIdrFor(url),
    }));
    // keep legacy onImport signature (urls array)
    if (onImport) onImport(links);
    const ev = new CustomEvent('linkbulk:import', { detail: enriched });
    window.dispatchEvent(ev);
    setAttemptedConfirm(false);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    // Allow default paste then normalize state (we'll append)
    setText((prev) => (prev ? prev + "\n" + pasted : pasted));
    e.preventDefault();
  }

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'mp-slab-fee') {
        try {
          setSlabFee(Number(e.newValue || '50000') || 50000);
        } catch (err) {
          setSlabFee(50000);
        }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
    <>
    <section className={`mt-6 rounded-2xl p-6 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white shadow-sm border border-zinc-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <label className={`block text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Paste full http(s) links (one per line)</label>
      </div>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onPaste={handlePaste}
          rows={6}
          className={`w-full rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDark ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600' : 'bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-500'}`}
          placeholder={"https://jp.mercari.com/item/123\nhttps://jp.mercari.com/item/456"}
        />

        <div className="absolute top-2 right-2 flex items-center gap-2">
          {invalidLines.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInvalid((s) => !s)}
              className={`text-sm px-3 py-1 rounded-md border ${isDark ? 'border-zinc-700 text-zinc-200 bg-zinc-800' : 'border-zinc-200 text-zinc-800 bg-white'}`}
            >
              Invalid: {invalidLines.length}
            </button>
          )}
        
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
        </div>

        {/* move the slab fee control into the header area beside Rate (rendered below) */}
      </div>

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
          <div className={`ml-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'} text-sm flex items-center gap-2`}>
            {!slabEditing ? (
              <button
                onClick={() => { setSlabEditing(true); setSlabEditValue(String(slabFee)); }}
                className="text-sm text-left"
                title="Edit slab fee"
              >
                Slab fee: <span className="font-medium">Rp {slabFee.toLocaleString('id-ID')}</span>
              </button>
            ) : (
              <input
                autoFocus
                value={slabEditValue}
                onChange={(e) => setSlabEditValue(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => {
                  const v = Number(slabEditValue) || 0;
                  setSlabFee(v);
                  try { localStorage.setItem('mp-slab-fee', String(v)); } catch (err) {}
                  setSlabEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = Number(slabEditValue) || 0;
                    setSlabFee(v);
                    try { localStorage.setItem('mp-slab-fee', String(v)); } catch (err) {}
                    setSlabEditing(false);
                  } else if (e.key === 'Escape') {
                    setSlabEditing(false);
                  }
                }}
                className="w-28 rounded border px-2 py-1 text-sm"
              />
            )}
          </div>
        </div>

        {/* mobile: show selector underneath to avoid crowding */}
        {renderDetectedRight && (
          <div className="sm:hidden mt-2">
            {renderDetectedRight}
          </div>
        )}
      </div>

      

      {/* per-link missing price warnings are rendered under each link item */}

      {links.length > 0 && (
        <div className={`mt-4 rounded-md p-3 border ${isDark ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-100 bg-white text-zinc-900'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center w-full gap-3">
                    <div className="flex-1 text-sm font-medium">Link</div>
                    <div className="w-24 text-sm font-medium text-center">Price (JPY)</div>
                    <div className="w-12 text-sm font-medium text-center">Slabbed</div>
                    <div className="w-24 text-sm font-medium text-right">Price (IDR)</div>
                  </div>
          </div>
          <div className="overflow-auto max-h-48">
            <ul className="space-y-2 text-sm">
              {links.map((l) => {
                const idr = calcIdrFor(l);
                const calcTooltip = (() => {
                  const j = prices[l];
                  if (!j || typeof customerRate !== 'number') return undefined;
                  const n = Number(String(j).replace(/[¥,\s]/g, '')) || 0;
                  const base = Math.round(n * customerRate);
                  const slabAmt = slabbed[l] ? slabFee : 0;
                  const baseStr = `Rp ${base.toLocaleString('id-ID')}`;
                  return slabbed[l]
                    ? `${n} JPY × ${customerRate} = ${baseStr} + Rp ${slabAmt.toLocaleString('id-ID')} slab`
                    : `${n} JPY × ${customerRate} = ${baseStr}`;
                })();

                return (
                  <li key={l} className="py-1">
                    <div className="flex items-center gap-3">
                      <a href={l} target="_blank" rel="noreferrer" className={`flex-1 min-w-0 truncate ${isDark ? 'text-white hover:underline' : 'text-indigo-600 hover:underline'}`}>{l}</a>
                      <div className="w-24 flex-none flex items-center justify-center">
                        <input
                          value={prices[l] ?? ''}
                          onChange={(e) => handlePriceChange(l, e.target.value)}
                          placeholder="JPY"
                          className={`w-full rounded px-2 py-1 text-sm ${isDark ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-50 text-zinc-900 border border-zinc-200'}`}
                        />
                      </div>
                      <div className="w-12 flex-none flex items-center justify-center">
                        <input type="checkbox" checked={!!slabbed[l]} onChange={(e) => handleSlabToggle(l, e.target.checked)} className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-24 flex-none text-right text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}
                        onMouseEnter={(e) => {
                          if (calcTooltip) {
                            if (hideTimeoutRef.current) { window.clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setHoverTooltip({ text: calcTooltip, rect });
                          }
                        }}
                        onMouseLeave={() => {
                          if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
                          hideTimeoutRef.current = window.setTimeout(() => { setHoverTooltip(null); hideTimeoutRef.current = null; }, 150);
                        }}
                      >
                        {idr ? `Rp ${idr.toLocaleString('id-ID')}` : <div aria-hidden className="invisible">placeholder</div>}
                      </div>
                    </div>
                    {/* per-link missing price warning (only show after Confirm click) */}
                    {attemptedConfirm && (!prices[l] || String(prices[l]).trim() === '') && (
                      <div className={`mt-1 text-xs ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>Please enter JPY price</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>Total: <span className="font-medium">{links.length}</span></div>
            <div className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Total IDR: <span className="font-medium">{(() => {
                const sum = links.reduce((acc, url) => {
                  const v = calcIdrFor(url);
                  return acc + (v ?? 0);
                }, 0);
                return sum > 0 ? `Rp ${sum.toLocaleString('id-ID')}` : '—';
              })()}</span>
            </div>
          </div>
          <div className="flex justify-end">
        <button
          type="button"
          onClick={handleImport}
            disabled={links.length === 0}
          className={`rounded-md px-5 py-2 text-sm font-semibold text-white shadow ${isDark ? 'bg-green-500 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          Confirm
        </button>
          </div>
        </div>
    </section>
    {hoverTooltip && typeof document !== 'undefined' && ReactDOM.createPortal(
      (() => {
        const TIP_W = 224; // matches w-56
        const top = Math.max(8, hoverTooltip.rect.top - 8);
        const left = Math.min(Math.max(8, hoverTooltip.rect.right + 8), window.innerWidth - TIP_W - 8);
        return (
          <div
            role="tooltip"
            onMouseEnter={() => { if (hideTimeoutRef.current) { window.clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; } }}
            onMouseLeave={() => { if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = window.setTimeout(() => { setHoverTooltip(null); hideTimeoutRef.current = null; }, 150); }}
            className={`${isDark ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-white text-zinc-900 border border-zinc-200'} z-50 fixed p-2 text-xs rounded-md shadow-lg`}
            style={{
              top: top + 'px',
              left: left + 'px',
              width: TIP_W + 'px',
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }}
          >
            {hoverTooltip.text}
          </div>
        );
      })(),
      document.body
    )}
    </>
  );
}

// Render portal tooltip at document.body so it can't be clipped by overflow containers
