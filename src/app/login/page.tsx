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
    <div className="mx-auto mt-20 max-w-sm">
      <div className="card p-6">
        <h1 className="text-lg font-bold">Systems CRM</h1>
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
