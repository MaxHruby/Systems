"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Přihlášení selhalo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-black text-white shadow-sm">S</span>
          <div>
            <h1 className="text-base font-bold leading-tight">Systems CRM</h1>
            <p className="text-xs text-slate-500">Systémy &amp; Automatizace</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-500">Zadej heslo pro přístup.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Heslo</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Přihlašuji…" : "Přihlásit"}
          </button>
        </form>
      </div>
    </div>
  );
}
