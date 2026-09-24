"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";

type Status = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export default function VerificationPanel({ initialStatus }: { initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!documentUrl) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/creator/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentUrl }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setStatus(data.verificationStatus);
    } else {
      setError(data.error ?? "Couldn't submit verification");
    }
  }

  if (status === "VERIFIED") {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        ✓ Verified creator
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Verification submitted — under review.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">
        {status === "REJECTED"
          ? "Your last submission was rejected. Upload a clearer ID document and resubmit."
          : "Verify your identity before you can post or go live. Upload a government-issued ID."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <FileUpload onUploaded={({ url }) => setDocumentUrl(url)} />
        <button
          onClick={handleSubmit}
          disabled={submitting || !documentUrl}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
