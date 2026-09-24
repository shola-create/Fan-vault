"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"FAN" | "CREATOR">("FAN");
  const [form, setForm] = useState({ name: "", email: "", password: "", username: "" });
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role, interestedIn }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      let data: any = null;

      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        const text = await res.text();
        data = text ? { error: text } : null;
      }

      if (!res.ok) {
        const message =
          data?.error?.fieldErrors
            ? Object.values(data.error.fieldErrors as Record<string, string[]>).flat()[0]
            : data?.error?.formErrors?.[0] ?? data?.error ?? "Unable to create your account. Please try again.";
        setError(typeof message === "string" ? message : "Unable to create your account. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("We could not reach the server. Please make sure the app is running and try again.");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.ok) {
      router.push(role === "CREATOR" ? "/dashboard" : "/");
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>

      <div className="flex rounded-full border border-stone-300 p-1">
        {(["FAN", "CREATOR"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 rounded-full py-2 text-sm transition ${
              role === r ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            {r === "FAN" ? "I'm a fan" : "I'm a creator"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          autoComplete="name"
          placeholder="Name"
          className="rounded-lg border border-stone-300 bg-black/20 px-4 py-2 text-white outline-none placeholder:text-stone-500 focus:border-[--accent]"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          autoComplete="username"
          placeholder="Username (e.g. jane123)"
          pattern="[a-z0-9_]+"
          className="rounded-lg border border-stone-300 bg-black/20 px-4 py-2 text-white outline-none placeholder:text-stone-500 focus:border-[--accent]"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
        />
        <input
          required
          autoComplete="email"
          type="email"
          placeholder="Email"
          className="rounded-lg border border-stone-300 bg-black/20 px-4 py-2 text-white outline-none placeholder:text-stone-500 focus:border-[--accent]"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          autoComplete="new-password"
          type="password"
          minLength={8}
          placeholder="Password (min 8 characters)"
          className="rounded-lg border border-stone-300 bg-black/20 px-4 py-2 text-white outline-none placeholder:text-stone-500 focus:border-[--accent]"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-800">I’m interested in:</p>
          <p className="mt-1 text-xs text-stone-500">Choose one or more. You can change these preferences later.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { value: "GIRLS", label: "Girls", emoji: "♀" },
              { value: "GUYS", label: "Guys", emoji: "♂" },
              { value: "TRANS", label: "Trans", emoji: "⚧" },
            ].map((option) => {
              const selected = interestedIn.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setInterestedIn((current) => selected ? current.filter((v) => v !== option.value) : [...current, option.value])}
                  className={`rounded-xl border px-3 py-3 text-sm transition ${selected ? "border-[--accent] bg-[--accent]/10 text-[--accent]" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
                >
                  <span className="block text-xl">{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="mt-2 rounded-full bg-[--accent] py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </main>
  );
}
