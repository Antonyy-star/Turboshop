"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await createClient().auth.signOut();
    router.replace("/logga-in?status=utloggad");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="self-start sm:self-auto border border-gray-300 bg-white hover:border-black text-black text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
    >
      {loading ? "Loggar ut..." : "Logga ut"}
    </button>
  );
}
