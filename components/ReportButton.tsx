"use client";
import { useState } from "react";

export default function ReportButton({ targetType, targetId, label = "Report" }: { targetType: "USER" | "POST" | "MESSAGE" | "LIVE_ROOM"; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  async function submit() {
    if (!reason.trim()) return;
    setSending(true);
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType, targetId, reason, details }) });
    setSending(false);
    if (r.ok) { setDone(true); setOpen(false); setReason(""); setDetails(""); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || "Could not submit report"); }
  }
  if (done) return <span className="text-xs text-emerald-500">Report submitted</span>;
  return <div className="inline-block">
    <button onClick={() => setOpen(true)} className="text-xs text-stone-500 underline hover:text-red-400">{label}</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 text-stone-900 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Report content</h3>
        <p className="mt-1 text-sm text-stone-500">Tell us what is wrong. Serious or illegal activity should be described clearly so moderators can review it.</p>
        <label className="mt-4 block text-sm font-medium">Reason</label>
        <select value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
          <option value="">Select a reason</option><option>Illegal activity</option><option>Non-consensual or abusive content</option><option>Sexual content involving a minor</option><option>Fraud or scam</option><option>Harassment or threats</option><option>Impersonation</option><option>Spam</option><option>Other</option>
        </select>
        <label className="mt-4 block text-sm font-medium">What happened?</label>
        <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Add any useful details…" />
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button><button disabled={sending || !reason} onClick={submit} className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">{sending ? "Sending…" : "Submit report"}</button></div>
      </div>
    </div>}
  </div>;
}
