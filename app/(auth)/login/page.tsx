"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/browser";
import TurnstileWidget from "@/components/turnstile-widget";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [resetCaptcha, setResetCaptcha] = useState<() => void>(() => () => {});

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!captchaToken) {
      setError("Confirme o captcha.");
      setLoading(false);
      resetCaptcha();
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (authError) {
      setError(authError.message);
      resetCaptcha();
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Entrar
          </h2>
          <p className="text-sm text-muted">
            Acesse com o email confirmado e sua senha.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              placeholder="voce@dnata.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              placeholder="Sua senha"
              required
            />
          </div>

          <TurnstileWidget
            siteKey={siteKey}
            onTokenChange={setCaptchaToken}
            onResetReady={setResetCaptcha}
          />

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[hsl(var(--ink))] px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-black/40"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="text-sm text-muted">
          Ainda nao tem conta?{" "}
          <Link href="/signup" className="font-semibold text-ink underline">
            Criar acesso
          </Link>
        </div>
      </div>
    </>
  );
}
