import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">MarketPorter</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="p-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-2 text-zinc-400">
          Welcome to MarketPorter. Dashboard coming soon.
        </p>
      </main>
    </div>
  );
}
