import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import CustomerModal from "@/components/CustomerModal";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; amount: number; description?: string; rate?: number; created_at?: string | null; user_id?: string | null };

export default function UsersPage() {
	const { user } = useAuth();
	const [users, setUsers] = useState<Customer[]>([]);
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

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from("customers")
					.select("id, name, amount, description, rate, created_at, user_id")
					.order("created_at", { ascending: false });
				if (error) throw error;
				setUsers((data ?? []) as Customer[]);
			} catch (err) {
				console.error("Failed to load customers:", err);
				setUsers([]);
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
			const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
			if (error) throw error;
			setUsers((s) => s.map((row) => (row.id === editingId ? { ...row, ...payload } : row)));
		} catch (err) {
			console.error('Failed to save customer edit:', err);
		}
		setEditingId(null);
		setEditingData(null);
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
										<tr className="text-left text-xs text-zinc-500">
											<th className="px-3 py-2">Name</th>
											<th className="px-3 py-2">Description</th>
											<th className="px-3 py-2">Rate</th>
											<th className="px-3 py-2">Amount</th>
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
												return (
													<tr key={u.id} ref={editing ? editingRef : null} className="align-top">
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100 font-semibold' : 'text-sm text-zinc-900 font-semibold'}`} onClick={() => startEdit(u)}>
															{editing ? (
																<input className="w-full rounded px-2 py-1 text-sm" value={String(editingData?.name ?? '')} onChange={(e) => handleEditChange('name', e.target.value)} />
															) : (
																u.name
															)}
														</td>
														<td className={`px-3 py-3 ${isDark ? 'text-xs text-zinc-300' : 'text-xs text-zinc-700'}`} onClick={() => startEdit(u)}>
															{editing ? (
																<input className="w-full rounded px-2 py-1 text-xs" value={String(editingData?.description ?? '')} onChange={(e) => handleEditChange('description', e.target.value)} />
															) : (
																u.description || '—'
															)}
														</td>
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100' : 'text-sm text-zinc-900'}`} onClick={() => startEdit(u)}>
															{editing ? (
																<input className="w-20 rounded px-2 py-1 text-sm" value={String(editingData?.rate ?? '')} onChange={(e) => handleEditChange('rate', Number(e.target.value))} />
															) : (
																String(u.rate ?? 130)
															)}
														</td>
														<td className={`px-3 py-3 ${isDark ? 'text-sm text-zinc-100' : 'text-sm text-zinc-900'} text-right`} onClick={() => startEdit(u)}>
															{editing ? (
																<input className="w-28 text-right rounded px-2 py-1 text-sm" value={String(editingData?.amount ?? '')} onChange={(e) => handleEditChange('amount', Number(e.target.value))} />
															) : (
																`Rp ${Number(u.amount).toLocaleString('id-ID')}`
															)}
														</td>
													</tr>
												);
											})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>

			<CustomerModal open={adding} onClose={() => setAdding(false)} onSave={handleSaveCustomer} isDark={isDark} />
		</div>
	);
}


