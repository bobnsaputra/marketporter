import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactDOM from 'react-dom';
import { supabase } from "../lib/supabase";

export default function LinkBulkInput({ onSave, detectedRight, customerRate, currentUserId, customerId }: { onSave?: (links: string[]) => void; detectedRight?: React.ReactNode; customerRate?: number; currentUserId?: string; customerId?: string }) {
  const [text, setText] = useState("");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
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
  const [importedCards, setImportedCards] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmItems, setConfirmItems] = useState<any[] | null>(null);

  // load persisted cards from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mp-imported-cards');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setImportedCards(parsed.map((c) => ({ ...c })));
      }
    } catch (err) {
      console.warn('Failed to parse persisted imported cards', err);
    }
  }, []);

  // persist cards to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('mp-imported-cards', JSON.stringify(importedCards));
    } catch (err) {
      console.warn('Failed to persist imported cards', err);
    }
  }, [importedCards]);

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

  function handleSaveClick() {
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

    // show confirmation modal before saving
    setConfirmItems(enriched);
    setShowConfirmModal(true);
  }

  function cancelConfirm() {
    setShowConfirmModal(false);
    setConfirmItems(null);
    setAttemptedConfirm(false);
  }

  async function confirmSave() {
    if (!confirmItems) return;
    const enriched = confirmItems;
    const createdAt = new Date().toISOString();
    const card = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
      createdAt,
      user: 'local',
      customer_id: customerId ?? null,
      items: enriched.map((it) => ({ ...it })),
      history: [{ createdAt, items: enriched.map((it) => ({ ...it })) }],
      supabaseStatus: 'pending',
    };
    setImportedCards((c) => [card, ...c]);
    setAttemptedConfirm(false);

    // clear preview inputs now that they are moved into a card
    setText('');
    setPrices({});
    setSlabbed({});
    setShowInvalid(false);

    // keep legacy onSave signature (urls array)
    if (onSave) onSave(enriched.map((i) => i.url));
    const ev = new CustomEvent('linkbulk:save', { detail: enriched });
    window.dispatchEvent(ev);

    // close modal
    setShowConfirmModal(false);
    setConfirmItems(null);

    // attempt to save to Supabase for the new card
    // pass the card object directly (avoids stale state closure issues)
    setTimeout(() => handleSaveCardToSupabase(card), 50);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    // Allow default paste then normalize state (we'll append)
    setText((prev) => (prev ? prev + "\n" + pasted : pasted));
    e.preventDefault();
  }

  function recomputeItem(it: any) {
    const j = it.price_jpy;
    if (!j || typeof customerRate !== 'number') return { ...it, price_idr: null };
    const n = Number(String(j).replace(/[¥,\s]/g, '')) || 0;
    const base = Math.round(n * customerRate);
    const slabAmt = it.slabbed ? slabFee : 0;
    return { ...it, price_idr: base + slabAmt };
  }

  function handleUpdateCard(id: string, next: any) {
    setImportedCards((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const items = (next.items || []).map(recomputeItem);
      return { ...c, ...next, items };
    }));
  }

  function handleSaveCard(id: string) {
    setImportedCards((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const snapshot = { createdAt: new Date().toISOString(), items: c.items.map((it: any) => ({ ...it })) };
      const hist = c.history ? [snapshot, ...c.history] : [snapshot];
      return { ...c, history: hist };
    }));
  }

  async function handleSaveCardToSupabase(idOrCard: string | any) {
    const card = typeof idOrCard === 'string' ? importedCards.find((c) => c.id === idOrCard) : idOrCard;
    if (!card) return;
    // prevent re-saving if already saved or currently saving
    if (card.supabaseStatus === 'saving' || card.supabaseStatus === 'saved') {
      console.warn('Skipping save: card already saving/saved', card.id, card.supabaseStatus);
      return;
    }
    const id = card.id;
    setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'saving' } : c));
    if (!supabase) {
      // no supabase client configured
      console.warn('No Supabase client found (supabase import)');
      setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'no-client' } : c));
      return;
    }
    try {
      const client = supabase;
      // prefer provided currentUserId prop, fall back to client auth if absent
      let user_id: string | null = currentUserId ?? null;
      if (!user_id) {
        try {
          if (client?.auth?.getUser) {
            const u = await client.auth.getUser();
            user_id = (u?.data as any)?.user?.id ?? null;
          } else if ((client.auth as any)?.user && typeof (client.auth as any).user === 'function') {
            const uu = (client.auth as any).user();
            user_id = uu?.id ?? null;
          }
        } catch (_) {
          user_id = null;
        }
      }

      const rows = card.items.map((it: any) => {
        const genId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : (`id_${Date.now()}_${Math.random().toString(36).slice(2,6)}`);
        return {
          id: genId,
          link: it.url,
          user_id: user_id,
          customer_id: customerId ?? null,
          price_jpy: it.price_jpy ? Number(String(it.price_jpy).replace(/[^0-9.-]/g, '')) : null,
          price_idr: it.price_idr ?? null,
          slabbed: !!it.slabbed,
          rate_used: typeof customerRate === 'number' ? Math.round(customerRate) : null,
          created_at: new Date().toISOString(),
        };
      });

      // Preflight: check for exact existing links to avoid unique-constraint 409s
      const incomingLinks = rows.map((r: any) => r.link);
      let existingExact: any[] = [];
      try {
        const { data: selData, error: selErr } = await client.from('orders').select('id,link').in('link', incomingLinks);
        if (selErr) {
          console.warn('Preflight select error', selErr);
        } else {
          existingExact = Array.isArray(selData) ? selData : [];
        }
      } catch (e) {
        // ignore preflight failure — we'll attempt insert and handle errors below
        console.warn('Preflight select exception', e);
      }

      const existingLinkSet = new Set(existingExact.map((r: any) => r.link));
      const rowsToInsert = rows.filter((r: any) => !existingLinkSet.has(r.link));

      if (rowsToInsert.length === 0) {
        // nothing to insert — mark saved and attach existing ids
        const existingIds = existingExact.map((r: any) => r.id);
        const existingSet = new Set(existingExact.map((r: any) => r.link));
        // mark items that already exist so UI can show alerts per-item
        setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'saved', supabaseData: existingExact, supabaseInsertedIds: existingIds, items: c.items.map((it:any)=> ({ ...it, exists: existingSet.has(it.url) })) } : c));
        try { setAlertMsg(`Saved ${existingIds.length} items (already existed)`); setTimeout(() => setAlertMsg(null), 3500); } catch {};
        return;
      }

      // Attempt insert; on duplicate-key error, fall back to upsert on 'link'
      const { data, error } = await client.from('orders').insert(rowsToInsert);
      if (error) {
        const msg = String(error?.message || '');
        const isDup = error?.code === '23505' || /duplicate key/i.test(msg) || /unique constraint/i.test(msg);
        if (isDup) {
          // try upsert on link (will update existing rows)
          const { data: upsertData, error: upErr } = await client.from('orders').upsert(rowsToInsert, { onConflict: 'link' });
          if (upErr) throw upErr;
          const upIds = Array.isArray(upsertData) ? (upsertData as any[]).map((r: any) => r.id) : [];
          setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'saved', supabaseData: upsertData, supabaseInsertedIds: upIds } : c));
          try { setAlertMsg(`Saved ${upIds.length} items (upsert)`); setTimeout(() => setAlertMsg(null), 3500); } catch {};
          return;
        }
        throw error;
      }

      // success
      const insertedIds = (Array.isArray(data) ? data : []).map((r: any) => (r as any).id);
      // mark items that were inserted (those in rowsToInsert) as not-exists
      const insertedLinkSet = new Set(rowsToInsert.map((r:any)=>r.link));
      setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'saved', supabaseData: data, supabaseInsertedIds: insertedIds, items: c.items.map((it:any)=> ({ ...it, exists: !insertedLinkSet.has(it.url) ? false : false })) } : c));
      try { setAlertMsg(`Saved ${rowsToInsert.length} items`); setTimeout(() => setAlertMsg(null), 3500); } catch {};
    } catch (err: any) {
      console.error('Supabase save error', err);
      let errText = '';
      try {
        if (err?.message) errText = `${err.message} ${JSON.stringify(err)}`;
        else errText = JSON.stringify(err);
      } catch (e) { errText = String(err); }
      setImportedCards((prev) => prev.map((c) => c.id === id ? { ...c, supabaseStatus: 'error', supabaseError: errText } : c));
    }
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
          <div className="hidden sm:block flex-shrink-0 w-45">
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
          onClick={handleSaveClick}
            disabled={links.length === 0}
          className={`rounded-md px-5 py-2 text-sm font-semibold text-white shadow ${isDark ? 'bg-green-500 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          Confirm
        </button>
          </div>
        </div>
    </section>
    {showConfirmModal && typeof document !== 'undefined' && ReactDOM.createPortal(
      <div className="fixed inset-0 z-60 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={cancelConfirm} />
        <div className={`relative z-50 w-full max-w-md rounded-md p-4 ${isDark ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-white text-zinc-900 border border-zinc-100'}`}>
            <div className="text-sm font-medium mb-2">Confirm save</div>
          <div className="text-sm mb-4">You're about to save <span className="font-medium">{confirmItems?.length ?? 0}</span> items. This will save them now.</div>
          <div className="flex justify-end gap-2">
            <button onClick={cancelConfirm} className={`px-3 py-1 rounded ${isDark ? 'bg-zinc-700 text-white' : 'bg-white border border-zinc-200'}`}>Cancel</button>
            <button onClick={confirmSave} className={`px-3 py-1 rounded ${isDark ? 'bg-green-500 text-white' : 'bg-green-600 text-white'}`}>Confirm</button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {/* Editable cards for confirmed imports */}
    {importedCards.length > 0 && (
        <div className="mt-6">
          <EditableCards cards={importedCards} onUpdate={handleUpdateCard} isDark={isDark} />
        </div>
    )}

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
    {alertMsg && typeof document !== 'undefined' && ReactDOM.createPortal(
      <div className="fixed top-6 right-6 z-60">
        <div className="rounded-md px-4 py-2 bg-green-600 text-white shadow">{alertMsg}</div>
      </div>,
      document.body
    )}
    </>
  );
}

// mount EditableCards inside main component by reading state; to avoid circular hooks, we'll export default remains unchanged

// Rendered editable cards UI helper functions (below)

function formatShort(dt?: string) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

export function EditableCards({ cards, onUpdate, isDark }: { cards: any[]; onUpdate: (id: string, next: any) => void; isDark?: boolean }) {
  return (
    <div className="mt-4 space-y-4">
      {cards.map((card) => (
        <div key={card.id} className={`border rounded-md p-3 ${isDark ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Order: {formatShort(card.createdAt)} — {card.user}</div>
            <div className="text-xs text-zinc-500">Items: {card.items.length}</div>
          </div>
          <div className="space-y-2">
            {card.items.map((it: any, idx: number) => (
              <div key={it.url + idx} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <a href={it.url} className={`truncate ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{it.url}</a>
                  {it.exists ? (
                    <span title="Already exists" className="text-red-500 text-xs">⚠</span>
                  ) : null}
                </div>
                {card.supabaseStatus === 'saved' ? (
                  <div className={`w-24 rounded px-2 py-1 text-sm ${isDark ? 'bg-transparent text-white' : 'bg-transparent text-zinc-900'}`}>{it.price_jpy ?? ''}</div>
                ) : (
                  <input value={it.price_jpy ?? ''} onChange={(e) => onUpdate(card.id, { ...card, items: card.items.map((x:any,i:number)=> i===idx ? { ...x, price_jpy: e.target.value } : x) })} className={`w-24 rounded px-2 py-1 text-sm border ${isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-200'}`} />
                )}
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!it.slabbed} disabled={card.supabaseStatus === 'saved'} onChange={(e) => onUpdate(card.id, { ...card, items: card.items.map((x:any,i:number)=> i===idx ? { ...x, slabbed: e.target.checked } : x) })} />
                  <span className="text-xs">Slab</span>
                </label>
                <div className="w-36 text-right text-sm">{it.price_idr ? `Rp ${it.price_idr.toLocaleString('id-ID')}` : '—'}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            {card.supabaseStatus === 'error' ? (
              <div className="text-xs px-2 py-1 rounded bg-red-600 text-white">Error</div>
            ) : null}
          </div>
          {card.history && card.history.length > 0 && (
            <div className={`mt-3 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              History:
              <ul className="mt-1 space-y-1">
                {card.history.map((h:any, i:number) => (
                  <li key={i}>{formatShort(h.createdAt)} — {h.items.length} items</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Render portal tooltip at document.body so it can't be clipped by overflow containers
