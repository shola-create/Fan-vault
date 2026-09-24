"use client";

import { useRef, useState } from "react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePictureUpload({ initialUrl }: { initialUrl: string | null }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError("Cloudinary isn't configured yet. Add the Cloudinary values to .env.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Profile pictures must be 8MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Upload failed");

      setSaving(true);
      const save = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: data.secure_url }),
      });
      const saved = await save.json();
      if (!save.ok) throw new Error(saved?.error ?? "Couldn't save profile picture");
      setAvatarUrl(saved.avatarUrl);
    } catch (err: any) {
      setError(err.message ?? "Couldn't update profile picture");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  async function remove() {
    setError(null); setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't remove profile picture");
      setAvatarUrl(null);
    } catch (err: any) { setError(err.message ?? "Couldn't remove profile picture"); }
    finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 text-stone-900">
      <h2 className="font-medium">Profile picture</h2>
      <p className="mt-1 text-sm text-stone-500">Add a profile picture so people can recognize you, including in the Live Now section.</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-stone-200 bg-stone-100">
          {avatarUrl ? <img src={avatarUrl} alt="Profile picture" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl text-stone-400">👤</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.currentTarget.value = ""; }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || saving} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{uploading ? "Uploading…" : saving ? "Saving…" : avatarUrl ? "Change picture" : "Add picture"}</button>
          {avatarUrl && <button type="button" onClick={remove} disabled={uploading || saving} className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50">Remove</button>}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
