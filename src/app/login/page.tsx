"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const action = isRegister ? register : login;
    const result = await action(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if ("confirm" in result) {
      setSuccess(result.confirm as string);
      setIsRegister(false);
      setLoading(false);
      return;
    }

    // Success — navigate to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <span className="text-lg font-semibold text-white">MarketPorter</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight text-white">
            JP Marketplace<br />
            Buying Service<br />
            Manager
          </h2>
          <p className="text-zinc-400 max-w-sm leading-relaxed">
            Organize orders, track purchases, and manage customers — all from Japanese marketplaces to worldwide delivery.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 bg-zinc-900/50">Mercari</span>
            <span className="px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 bg-zinc-900/50">PayPay Flea Market</span>
            <span className="text-zinc-600">& more</span>
          </div>
        </div>

        <p className="text-xs text-zinc-600">
          🇯🇵 Japan → 🌏 Worldwide
        </p>
      </div>

      {/* Right side — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 bg-zinc-950">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only logo */}
          <div className="text-center lg:hidden">
            <div className="inline-flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-white font-bold text-sm">MP</span>
              </div>
              <span className="text-lg font-semibold text-white">MarketPorter</span>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              JP Marketplace Buying Service Manager
            </p>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {isRegister ? "Create an account" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {isRegister
                ? "Set up your admin account to get started"
                : "Sign in to your admin dashboard"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300"
              >
                Password
              </label>
              <input
                key={isRegister ? "register-password" : "login-password"}
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="mt-1.5 block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
              {isRegister && (
                <p className="mt-1.5 text-xs text-zinc-600">Must be at least 6 characters</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-900 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-950/50 border border-emerald-900 px-4 py-3 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading
                ? (isRegister ? "Creating account..." : "Signing in...")
                : (isRegister ? "Create account" : "Sign in")}
            </button>
          </form>

          {/* Toggle login/register */}
          <div className="text-center">
            <p className="text-sm text-zinc-500">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(null); setSuccess(null); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {isRegister ? "Sign in" : "Register"}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-zinc-700 lg:hidden">
            🇯🇵 Japan → 🌏 Worldwide
          </p>
        </div>
      </div>
    </div>
  );
}
