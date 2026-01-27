"use client";

import { useState } from "react";
import Link from "next/link";

import TurnstileWidget from "@/components/turnstile-widget";

type Colaborador = {
  nome: string;
  filial: string;
  funcao: string;
};

export default function SignupPage() {
  const [matricula, setMatricula] = useState("");
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [resetCaptcha, setResetCaptcha] = useState<() => void>(() => () => {});

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const fetchColaborador = async (value: string) => {
    setError("");
    setColaborador(null);

    if (!value) return null;

    const res = await fetch(
      `/api/colaboradores?matricula=${encodeURIComponent(value)}`
    );
    if (!res.ok) {
      setError("Matricula nao encontrada.");
      return null;
    }

    const data = (await res.json()) as Colaborador;
    setColaborador(data);
    return data;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    let currentColaborador = colaborador;
    if (!currentColaborador) {
      currentColaborador = await fetchColaborador(matricula.trim());
      if (!currentColaborador) {
        setError("Matricula nao encontrada.");
        return;
      }
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    if (!captchaToken) {
      setError("Confirme o captcha.");
      if (typeof resetCaptcha === "function") resetCaptcha();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricula: matricula.trim(),
          email,
          password,
          captchaToken,
        }),
      });

      const bodyText = await res.text();
      let data: any = null;
      if (bodyText) {
        try {
          data = JSON.parse(bodyText);
        } catch {
          data = { raw: bodyText };
        }
      }

      if (!res.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || data?.raw;
        setError(errorMessage || "Erro ao cadastrar.");
        if (typeof resetCaptcha === "function") resetCaptcha();
        return;
      }

      setSuccess(true);
      setMatricula("");
      setColaborador(null);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCaptchaToken("");
      if (typeof resetCaptcha === "function") resetCaptcha();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha inesperada no cadastro.";
      setError(message);
      if (typeof resetCaptcha === "function") resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Criar acesso
          </h2>
          <p className="text-sm text-muted">
            Use a matricula oficial. O email precisa ser confirmado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Matricula
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              onBlur={() => fetchColaborador(matricula.trim())}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              placeholder="Sua matricula"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Nome
              </label>
              <input
                type="text"
                value={colaborador?.nome ?? ""}
                readOnly
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-ink/80"
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Filial
              </label>
              <input
                type="text"
                value={colaborador?.filial ?? ""}
                readOnly
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-ink/80"
                placeholder="Base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Funcao
            </label>
            <input
              type="text"
              value={colaborador?.funcao ?? ""}
              readOnly
              className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-ink/80"
              placeholder="Funcao"
            />
          </div>

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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
                placeholder="Crie uma senha"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
                placeholder="Repita a senha"
                required
              />
            </div>
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

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Cadastro criado. Confirme o email para entrar.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[hsl(var(--ink))] px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-black/40"
          >
            {loading ? "Enviando..." : "Cadastrar"}
          </button>
        </form>

        <div className="text-sm text-muted">
          Ja tem acesso?{" "}
          <Link href="/login" className="font-semibold text-ink underline">
            Entrar
          </Link>
        </div>
      </div>
    </>
  );
}
