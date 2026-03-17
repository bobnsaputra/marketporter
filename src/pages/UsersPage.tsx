// Helper to format date/time for recent orders
function formatShort(dt?: string) {
	if (!dt) return '';
	try { return new Date(dt).toLocaleString(); } catch { return dt; }
}
import { useEffect, useState, useRef, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import CustomerModal from "@/components/CustomerModal";
import EditCustomerModal from "@/components/EditCustomerModal";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; amount: number; description?: string; rate?: number; created_at?: string | null; user_id?: string | null };
type Order = { id: string; customer_id: string | null; price_idr: number | null; status: string; created_at: string; link: string; price_jpy: number | null };

export default function UsersPage() {
	const { user } = useAuth();
	const [users, setUsers] = useState<Customer[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(false);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isDark, setIsDark] = useState<boolean>(() => {
		try {
			const stored = localStorage.getItem("mp-theme");
			if (stored === "dark") return true;
			return document.documentElement.classList.contains("dark");
		} catch (e) {
			return false;
		}
	});
	const [adding, setAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingData, setEditingData] = useState<Partial<Customer> | null>(null);
	const editingRef = useRef<HTMLTableRowElement | null>(null);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const [{ data: custs, error: custErr }, { data: ords, error: ordErr }] = await Promise.all([
					supabase
						.from("customers")
						.select("id, name, amount, description, rate, created_at, user_id")
						.order("created_at", { ascending: false }),
					supabase
						.from("orders")
						.select("id, customer_id, price_idr, status, created_at, link, price_jpy")
				]);
				if (custErr) throw custErr;
				if (ordErr) throw ordErr;
				setUsers((custs ?? []) as Customer[]);
				setOrders((ords ?? []) as Order[]);
			} catch (err) {
				console.error("Failed to load customers or orders:", err);
				setUsers([]);
				setOrders([]);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	// debounce search input (250ms)
	useEffect(() => {
		const id = setTimeout(() => setDebouncedQuery(query), 250);
		return () => clearTimeout(id);
	}, [query]);

	useEffect(() => {
		// observe changes to document.documentElement class to react to theme toggles
		const root = document.documentElement;
		const obs = new MutationObserver(() => {
			setIsDark(root.classList.contains("dark"));
		});
		obs.observe(root, { attributes: true, attributeFilter: ["class"] });
		return () => obs.disconnect();
	}, []);

	// click-outside handler: if editing, save current edits when clicking outside the editing row
	useEffect(() => {
		if (!editingId) return;
		function onDocMouseDown(e: MouseEvent) {
			// ignore clicks inside modal/dialogs (role="dialog") to avoid closing when interacting with modal inputs
			if (e.target instanceof Element && e.target.closest && e.target.closest('[role="dialog"]')) return;
			if (editingRef.current && e.target instanceof Node && editingRef.current.contains(e.target)) return;
			handleSaveEdit();
		}
		document.addEventListener('mousedown', onDocMouseDown);
		return () => document.removeEventListener('mousedown', onDocMouseDown);
	}, [editingId, editingData]);

	async function handleSaveCustomer(data: Customer) {
		// persist to Supabase
		try {
			const payload = {
				id: data.id,
				name: data.name,
				amount: data.amount,
				rate: data.rate ?? 130,
				description: data.description ?? null,
				created_at: new Date().toISOString(),
				user_id: (user as any)?.id ?? null,
			};
			const { error } = await supabase.from("customers").insert([payload]);
			if (error) {
				console.error("Supabase insert error:", error);
				// fallback to local state
				setUsers((s) => [data, ...s]);
			} else {
				setUsers((s) => [data, ...s]);
			}
		} catch (err) {
			console.error(err);
			setUsers((s) => [data, ...s]);
		}
	}

	function startEdit(u: Customer) {
		setEditingId(u.id);
		setEditingData({ name: u.name, description: u.description, rate: u.rate, amount: u.amount });
	}

	function handleEditChange(field: keyof Customer, value: any) {
		setEditingData((d) => ({ ...(d ?? {}), [field]: value }));
	}

	async function handleSaveEdit() {
		if (!editingId || !editingData) return setEditingId(null);
		const payload: any = {};
		if (editingData.name !== undefined) payload.name = String(editingData.name);
		if (editingData.description !== undefined) payload.description = editingData.description || null;
		if (editingData.rate !== undefined) payload.rate = Number(editingData.rate) || 130;
		if (editingData.amount !== undefined) payload.amount = Number(editingData.amount) || 0;
		try {
			const res = await supabase.from('customers').update(payload).eq('id', editingId).select();
			if (res.error) {
				console.error('Supabase update error:', res.error, { payload, editingId });
				window.alert('Failed to save changes: ' + (res.error.message || String(res.error)));
			} else if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
				console.warn('Supabase update returned no data', { payload, editingId, res });
				// diagnostic: fetch the row and auth user to help debug RLS/permission issues
				try {
					const sel = await supabase.from('customers').select('*').eq('id', editingId);
					console.info('Diagnostic select after empty update:', sel);
					const authRes = await supabase.auth.getUser();
					console.info('Supabase auth.getUser():', authRes);
				} catch (diagErr) {
					console.error('Diagnostic query failed:', diagErr);
				}
				window.alert('Update did not return an updated row. Check RLS/permissions.');
				setUsers((s) => s.map((row) => (row.id === editingId ? { ...row, ...payload } : row)));
			} else if (Array.isArray(res.data)) {
				if (res.data.length === 1) {
					setUsers((s) => s.map((r) => (r.id === editingId ? (res.data[0] as Customer) : r)));
				} else {
					console.warn('Supabase update returned multiple rows for id', { editingId, rows: res.data });
					// fallback: merge payload
					setUsers((s) => s.map((row) => (row.id === editingId ? { ...row, ...payload } : row)));
				}
			} else {
				const row = Array.isArray(res.data) ? (res.data[0] as Customer) : (res.data as Customer);
				if (row) setUsers((s) => s.map((r) => (r.id === editingId ? row : r)));
			}
		} catch (err) {
			console.error('Failed to save customer edit:', err);
		}
		setEditingId(null);
		setEditingData(null);
	}

	async function handleSaveFromModal(data: { id: string; name: string; amount: number; description?: string; rate?: number }) {
		const payload: any = {};
		if (data.name !== undefined) payload.name = String(data.name);
		if (data.description !== undefined) payload.description = data.description || null;
		if (data.rate !== undefined) payload.rate = Number(data.rate) || 130;
		if (data.amount !== undefined) payload.amount = Number(data.amount) || 0;
		try {
			const res = await supabase.from('customers').update(payload).eq('id', data.id).select();
			if (res.error) {
				console.error('Supabase update error (modal):', res.error, { payload, id: data.id });
				window.alert('Failed to save changes: ' + (res.error.message || String(res.error)));
			} else if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
				console.warn('Supabase update returned no data (modal)', { payload, id: data.id, res });
				// diagnostic: fetch the row and auth user to help debug RLS/permission issues
				try {
					const sel = await supabase.from('customers').select('*').eq('id', data.id);
					console.info('Diagnostic select after empty update (modal):', sel);
					const authRes = await supabase.auth.getUser();
					console.info('Supabase auth.getUser() (modal):', authRes);
				} catch (diagErr) {
					console.error('Diagnostic query failed (modal):', diagErr);
				}
				window.alert('Update did not return an updated row. Check RLS/permissions.');
				setUsers((s) => s.map((row) => (row.id === data.id ? { ...row, ...payload } : row)));
			} else if (Array.isArray(res.data)) {
				if (res.data.length === 1) {
					setUsers((s) => s.map((r) => (r.id === data.id ? (res.data[0] as Customer) : r)));
				} else {
					console.warn('Supabase update returned multiple rows for id (modal)', { id: data.id, rows: res.data });
					setUsers((s) => s.map((row) => (row.id === data.id ? { ...row, ...payload } : row)));
				}
			} else {
				const row = Array.isArray(res.data) ? (res.data[0] as Customer) : (res.data as Customer);
				if (row) setUsers((s) => s.map((r) => (r.id === data.id ? row : r)));
			}
		} catch (err) {
			console.error('Failed to save customer from modal:', err);
		}
		setEditingId(null);
		setEditingData(null);
	}

	// Inline portal editor removed; editing now uses a modal to avoid clipping/overflow issues.

	function badgeFor(status: string) {
		return (
			status === 'pending' ? `inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200 text-zinc-800'}`
			: status === 'processed' ? 'inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono bg-sky-600 text-white'
			: status === 'arrived' ? 'inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono bg-amber-500 text-white'
			: status === 'shipped' ? 'inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono bg-blue-600 text-white'
			: status === 'completed' ? 'inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono bg-emerald-700 text-white'
			: status === 'cancelled' ? 'inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono bg-red-600 text-white'
			: `inline-block mr-2 mb-1 px-2 py-0.5 rounded text-xxs font-mono ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200 text-zinc-800'}`
		);
	}

 

	return (
		<div className="min-h-full">
			<div className="max-w-6xl mx-auto">
				<div className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? "border dark:border-zinc-800 bg-zinc-950" : "border border-zinc-100 bg-white"}`}>
					<div className={`px-4 py-3 ${isDark ? "border-b dark:border-zinc-800 bg-zinc-900" : "border-b border-zinc-100 bg-zinc-50"}`}>
						<div className="flex items-center justify-between">
							<div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-900"}`}>Total: {users.length}</div>
							<div>
								<button
									onClick={() => setAdding(true)}
									className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transform transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
										<path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
									</svg>
									Add customer
								</button>
							</div>
						</div>
					</div>

					<div className="p-4">
						<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div className="flex items-center gap-2 w-full sm:w-auto">
								<div className="relative w-full sm:w-96">
									<svg className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
									</svg>
									<input
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Search name or description..."
										className={`w-full pl-10 pr-3 py-2 rounded-full border ${isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'} shadow-sm focus:outline-none`}
									/>
								</div>
							</div>
							<div className="text-sm text-zinc-500">Showing {users.length} total</div>
						</div>

						{loading ? (
							<div className="text-center py-8 text-sm text-zinc-500">Loading customers…</div>
						) : users.length === 0 ? (
							<div className="text-center py-8">
								<div className={`${isDark ? "text-sm text-white" : "text-sm text-zinc-500"}`}>No customers yet. Imported customers will appear here.</div>
							</div>
                            ) : (
                            	<div className="overflow-auto">
								<table className="w-full text-sm table-auto">
									<thead>
										<tr className="text-left text-xs">
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Name</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Description</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Rate</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Amount</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Orders</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Total IDR</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Last Order</th>
											<th className={`px-3 py-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Status Breakdown</th>
										</tr>
									</thead>
									<tbody className={`${isDark ? 'divide-y divide-zinc-800' : 'divide-y divide-zinc-100'}`}>
										{users
											.filter((u) => {
												const q = debouncedQuery.trim().toLowerCase();
												if (q && !(u.name.toLowerCase().includes(q) || (u.description || "").toLowerCase().includes(q))) return false;
												return true;
											})
											.map((u) => {
												const editing = editingId === u.id;
												// Aggregate order stats for this customer
												const custOrders = orders.filter(o => o.customer_id === u.id);
												const totalOrders = custOrders.length;
												const totalIdr = custOrders.reduce((acc, o) => acc + (Number(o.price_idr) || 0), 0);
												const lastOrder = custOrders.reduce((latest, o) => (!latest || new Date(o.created_at) > new Date(latest.created_at)) ? o : latest, null as Order | null);
												const statusCounts: Record<string, number> = {};
												custOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
										return (
											<Fragment key={u.id}>
												<tr ref={editing ? editingRef : null} className="align-top">
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100 font-semibold' : 'text-sm text-zinc-900 font-semibold'}`}>
															<div className="flex items-center gap-2">
																<button
																	type="button"
																	aria-label={expanded[u.id] ? 'Hide orders' : 'Show orders'}
																	onClick={() => setExpanded(e => ({ ...e, [u.id]: !e[u.id] }))}
																	className={`w-6 h-6 flex items-center justify-center rounded border transition ${isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'} hover:border-indigo-500`}
																>
																	<svg className={`w-4 h-4 transition-transform duration-150 ${expanded[u.id] ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
																</button>
																<div className={`relative flex-1 ${editing ? (isDark ? 'bg-zinc-900' : 'bg-yellow-50') : ''} rounded`} onClick={() => startEdit(u)}>
																	<span className="cursor-pointer block max-w-[5ch] overflow-hidden text-ellipsis" title={u.name}>{u.name}</span>
																</div>
															</div>
														</td>
														<td className={`px-3 py-3 max-w-xs truncate ${isDark ? 'text-xs text-zinc-300' : 'text-xs text-zinc-700'}`} style={{maxWidth:'360px'}}>
															<div className={`relative ${editing ? (isDark ? 'bg-zinc-900' : 'bg-yellow-50') : ''} rounded`} onClick={() => startEdit(u)}>
																<div className="truncate">{u.description || '—'}</div>
															</div>
														</td>
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100' : 'text-sm text-zinc-900'}`}>
															<div className={`relative w-20 ${editing ? (isDark ? 'bg-zinc-900' : 'bg-yellow-50') : ''} rounded`} onClick={() => startEdit(u)}>
																<div className="text-sm">{String(u.rate ?? 130)}</div>
															</div>
														</td>
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100' : 'text-sm text-zinc-900'} text-right`}>
															<div className={`relative w-28 text-right ${editing ? (isDark ? 'bg-zinc-900' : 'bg-yellow-50') : ''} rounded`} onClick={() => startEdit(u)}>
																<div className="text-right">{`Rp ${Number(u.amount).toLocaleString('id-ID')}`}</div>
															</div>
														</td>
														<td className="px-3 py-3 text-center">{totalOrders}</td>
														<td className="px-3 py-3 text-right">{totalIdr > 0 ? `Rp ${totalIdr.toLocaleString('id-ID')}` : '—'}</td>
														<td className="px-3 py-3 text-xs">{lastOrder ? formatShort(lastOrder.created_at) : '—'}</td>
														<td className="px-3 py-3 text-xs">
															{Object.keys(statusCounts).length === 0 ? '—' : (
																<ul className="list-none m-0 p-0">
																	{Object.entries(statusCounts).map(([status, count]) => (
																		<li key={status} className="mb-1"><span className={badgeFor(status)}>{status}: {count}</span></li>
																	))}
																</ul>
															)}
														</td>
														</tr>
														{expanded[u.id] && (
															<tr>
																<td colSpan={8} className={`px-0 py-0`}>
																	<div className={`mx-4 my-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'} shadow-sm`}>
																	<div className={`px-4 pt-3 mb-1 text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-800'}`}>Recent Orders</div>
																	{custOrders.length === 0 ? (
																		<div className="px-4 pb-3 text-xs text-zinc-400">No orders for this customer.</div>
																	) : (
																		<div className="overflow-x-auto" style={{maxHeight:'260px',overflowY:'auto'}}>
																			<table className="w-full text-xs">
																				<thead>
																					<tr>
																						<th className={`text-left px-2 py-1 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Link</th>
																						<th className={`text-right px-2 py-1 ${isDark ? 'text-white' : 'text-zinc-800'}`}>JPY</th>
																						<th className={`text-right px-2 py-1 ${isDark ? 'text-white' : 'text-zinc-800'}`}>IDR</th>
																						<th className={`text-center px-2 py-1 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Status</th>
																						<th className={`text-center px-2 py-1 ${isDark ? 'text-white' : 'text-zinc-800'}`}>Created</th>
																					</tr>
																				</thead>
																				<tbody>
																					{custOrders
																						.slice()
																						.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
																						.map((o) => (
																							<tr key={o.id}>
																							<td className="px-2 py-1 truncate max-w-xs"><a href={o.link} className="text-indigo-600 dark:text-indigo-400 underline font-semibold" target="_blank" rel="noopener noreferrer">{o.link}</a></td>
																								<td className="px-2 py-1 text-right">{o.price_jpy ? `¥${Number(o.price_jpy).toLocaleString('ja-JP')}` : '—'}</td>
																								<td className="px-2 py-1 text-right">{o.price_idr ? `Rp ${Number(o.price_idr).toLocaleString('id-ID')}` : '—'}</td>
																								<td className="px-2 py-1 text-center">
																									<span className={`inline-block px-2 py-0.5 rounded text-xxs font-mono
																										${o.status === 'pending' ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
																											: o.status === 'processed' ? 'bg-sky-600 text-white'
																											: o.status === 'arrived' ? 'bg-amber-500 text-white'
																											: o.status === 'shipped' ? 'bg-blue-600 text-white'
																											: o.status === 'completed' ? 'bg-emerald-700 text-white'
																											: o.status === 'cancelled' ? 'bg-red-600 text-white'
																											: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'}
																									`}>{o.status}</span>
																								</td>
																								<td className="px-2 py-1 text-center">{formatShort(o.created_at)}</td>
																							</tr>
																						))}
																				</tbody>
																			</table>
																		</div>
																		)}
																	</div>
																</td>
															</tr>
														)}
													</Fragment>
												);
											})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>

			<EditCustomerModal
				open={!!editingId}
				onClose={() => setEditingId(null)}
				initial={{ id: editingId ?? '', name: editingData?.name ?? '', amount: Number(editingData?.amount ?? 0), description: editingData?.description ?? undefined, rate: editingData?.rate ?? undefined }}
				onSave={handleSaveFromModal}
				isDark={isDark}
			/>
			<CustomerModal open={adding} onClose={() => setAdding(false)} onSave={handleSaveCustomer} isDark={isDark} />
		</div>
	);
}


