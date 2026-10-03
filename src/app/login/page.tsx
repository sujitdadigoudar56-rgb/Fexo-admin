"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Eye, EyeOff, Lock, ShieldAlert, User } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-[42px] w-full rounded-sm border border-secure-700 bg-secure-800 pl-10 text-sm text-white placeholder:text-secure-500 " +
  "focus:border-white focus:outline-none focus:ring-2 focus:ring-white/20";

function nextPath() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  // Only allow same-app relative paths.
  return next && next.startsWith("/") && !next.startsWith("//") && next !== "/login" ? next : "/dashboard";
}

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(nextPath());
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your administrator email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password, remember);
      router.replace(nextPath());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the FEXO API. Is the backend running?");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secure-950 text-white">
      <div className="flex h-11 items-center justify-between border-b border-secure-700 px-4 text-xs text-secure-500 sm:px-10">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-secure-accent" aria-hidden />
          FEXO Admin Server
        </span>
        <span className="hidden sm:inline">Staff access only</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[440px] rounded-lg border border-secure-700 bg-secure-900 p-6 sm:p-9">
          <div className="mb-8 flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-sm bg-white font-display text-2xl font-bold text-black">
              F
            </span>
            <div className="flex flex-col items-center gap-2">
              <p className="font-display text-2xl tracking-wide">FEXO</p>
              <span className="rounded-pill border border-secure-700 bg-secure-800 px-3 py-1 text-[11px] font-semibold tracking-wider text-white uppercase">Secure Admin Portal</span>
            </div>
          </div>

          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl text-white">Administrator Sign In</h1>
            <p className="mt-1.5 text-sm text-secure-500">Sign in with your staff account credentials</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-white" htmlFor="adminEmail">
                Administrator Username / Email<span className="ml-0.5 text-secure-500">*</span>
              </label>
              <div className="relative flex items-center">
                <User className="pointer-events-none absolute left-3.5 size-4 text-ink-500" aria-hidden />
                <input
                  id="adminEmail"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pr-4`}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-white" htmlFor="adminPassword">
                Security Password<span className="ml-0.5 text-secure-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3.5 size-4 text-ink-500" aria-hidden />
                <input
                  id="adminPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 text-ink-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-secure-500">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-white"
              />
              Remember this workstation
            </label>

            {error && (
              <p role="alert" className="rounded-sm border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-sm text-[#f2b8b5]">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full bg-white text-black hover:bg-cream-200 active:bg-cream-300 focus-visible:ring-white/40 focus-visible:ring-offset-secure-900">
              Authenticate &amp; Proceed
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-sm border border-secure-700 bg-secure-800/60 p-4 text-xs text-secure-500">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Authorized personnel only. Only staff accounts can sign in here; customer accounts are rejected.
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-secure-500">
            <CircleCheck className="size-3.5" aria-hidden />
            Credentials are verified against the FEXO API.
          </p>
        </div>
      </div>

      <div className="flex h-10 items-center justify-between border-t border-secure-700 px-4 text-[11px] text-secure-500 sm:px-10">
        <span>SYSTEM STATUS: OK</span>
        <span>© {new Date().getFullYear()} FEXO</span>
      </div>
    </div>
  );
}
