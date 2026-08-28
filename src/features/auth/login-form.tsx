"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

type LoginFormProps = {
  redirectTo: string;
  errorParam?: string;
};

export function LoginForm({ redirectTo, errorParam }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "CredentialsSignin" || errorParam === "Callback"
      ? "Email/username atau kata sandi salah."
      : errorParam
      ? "Gagal masuk. Silakan coba lagi."
      : null
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await signIn("credentials", {
        identifier: String(formData.get("identifier") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
        redirectTo,
      });

      if (!result || result.error) {
        setError("Email/username atau kata sandi salah.");
        setSubmitting(false);
        return;
      }

      if (result.ok) {
        window.location.href = redirectTo;
        return;
      }
    } catch {
      setError("Login belum dapat diproses. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Email atau username</span>
        <span className="relative block">
          <Mail
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="admin@telurjagoan.id atau admin"
            required
            className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Kata sandi</span>
        <span className="relative block">
          <Lock
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            minLength={8}
            required
            className="h-11 w-full rounded-lg border bg-background pl-10 pr-11 text-sm transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      <div className="flex justify-end text-sm">
        <Link href="/login#forgot-password" className="font-medium text-primary hover:underline">
          Lupa kata sandi?
        </Link>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? "Memproses..." : "Masuk ke Dashboard"}
        {!submitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
