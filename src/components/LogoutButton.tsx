"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/login/actions";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-zinc-400 hover:text-white transition-colors"
    >
      Sign out
    </button>
  );
}
