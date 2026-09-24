"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AmbassadorRedeem({ isAmbassador }: { isAmbassador: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redeemed, setRedeemed] = useState(isAmbassador);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/ambassador/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setRedeemed(true);
      // Re-run the server component so isAmbassador / canPostOrGoLive
      // and every other prop derived from the DB reflect the redemption
      // immediately, instead of waiting for a manual page reload.
      router.refresh();
    } else {
      setError(data.error ?? "Couldn't redeem that code");
    }
  }

  if (redeemed) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        ✓ Ambassador — subscriptions are free on this account.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 p-4">
      <h2 className="font-medium">Ambassador code</h2>
      <p className="mt-1 text-sm text-stone-500">Have an ambassador code? Enter it to unlock free access.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. A1B2C3D4"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase"
        />
        <button
          disabled={submitting || !code.trim()}
          className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Redeem"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
