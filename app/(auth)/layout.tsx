import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[hsl(var(--brand))/0.12] blur-3xl" />
          <div className="absolute right-10 top-0 h-64 w-64 rounded-full bg-[hsl(var(--brand-2))/0.18] blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[hsl(var(--brand))/0.08] blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center gap-6 text-balance">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                Portal Dnata
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight text-ink md:text-5xl">
                Operacao em tempo real para quem esta no controle.
              </h1>
              <p className="max-w-xl text-base text-muted md:text-lg">
                Acompanhe batidas de ponto, hora extra e disponibilidade com foco
                total na operacao. Simples, rapido e seguro.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span>Base por usuario</span>
                <span className="h-1 w-1 rounded-full bg-muted/50" />
                <span>Admins com visao total</span>
              </div>
            </div>
            <div className="glass soft-shadow rounded-3xl border border-white/60 bg-white/80 p-8 md:p-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
