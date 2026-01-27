"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppTabs from "@/components/app-tabs";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  nome: string | null;
  filial: string | null;
  funcao: string | null;
  role: string | null;
};

type DashboardBaseRow = {
  colaborador_filial: string | null;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlanejamentoClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bases, setBases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBase, setSelectedBase] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIsoDate);

  const canViewAllBases =
    profile?.role === "admin" ||
    profile?.filial === "SEDE" ||
    profile?.filial === "HQ2";

  const fetchBases = useCallback(async () => {
    if (!profile) return;

    setError("");

    // Non-admins stick to their own base for now.
    if (!canViewAllBases && profile.filial) {
      setBases([profile.filial]);
      setSelectedBase(profile.filial);
      return;
    }

    const pageSize = 1000;
    const allRows: DashboardBaseRow[] = [];
    let from = 0;
    let fetchError: string | null = null;

    while (fetchError === null) {
      const { data: rows, error: rpcError } = await supabase
        .rpc("get_dashboard")
        .range(from, from + pageSize - 1);

      if (rpcError) {
        fetchError = rpcError.message;
        break;
      }

      const page = (rows ?? []) as DashboardBaseRow[];
      allRows.push(...page);

      if (page.length < pageSize) break;
      from += pageSize;
    }

    if (fetchError) {
      setError(fetchError);
      return;
    }

    const blocked = new Set(["SEDE", "HQ2"]);
    const baseSet = new Set<string>();
    allRows.forEach((row) => {
      const base = row.colaborador_filial?.trim().toUpperCase();
      if (!base || blocked.has(base)) return;
      baseSet.add(base);
    });

    const ordered = Array.from(baseSet).sort((a, b) => a.localeCompare(b));
    setBases(ordered);
  }, [canViewAllBases, profile, supabase]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, nome, filial, funcao, role")
        .eq("id", userId)
        .single();

      if (profileError) {
        setError("Falha ao carregar perfil.");
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);
      setLoading(false);
    };

    loadProfile();
  }, [supabase, userId]);

  useEffect(() => {
    if (!profile) return;
    fetchBases();
  }, [profile, fetchBases]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Operacao diaria
              </p>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Planejamento de equipes
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchBases()}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5"
              >
                Atualizar
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-muted transition hover:text-ink"
              >
                Sair
              </button>
            </div>
          </div>
          <AppTabs />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pt-8">
        <div className="glass soft-shadow rounded-3xl p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1 space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Base
              </label>
              <select
                value={selectedBase}
                onChange={(event) => setSelectedBase(event.target.value)}
                disabled={!canViewAllBases}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {!canViewAllBases && (
                  <option value={profile?.filial || ""}>
                    {profile?.filial || "SEM BASE"}
                  </option>
                )}
                {canViewAllBases && (
                  <>
                    <option value="">Todas</option>
                    {bases.map((base) => (
                      <option key={base} value={base}>
                        {base}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="min-w-[180px] space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Esta area vai cruzar voos do dia com equipes disponiveis para montar
            o planejamento diario.
          </p>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass soft-shadow rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Voos do dia
            </p>
            <p className="mt-2 text-sm text-muted">
              Em breve: tabela de voos, horarios, companhias e demanda prevista.
            </p>
          </div>
          <div className="glass soft-shadow rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Equipes disponiveis
            </p>
            <p className="mt-2 text-sm text-muted">
              Em breve: quem esta livre, em jornada, ou chegando nos proximos
              blocos.
            </p>
          </div>
          <div className="glass soft-shadow rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Planejamento
            </p>
            <p className="mt-2 text-sm text-muted">
              Em breve: alocacao manual assistida com sugestoes e alertas.
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-black/5 bg-white/60 px-6 py-4 text-sm text-muted">
            Carregando planejamento...
          </div>
        )}
      </div>
    </div>
  );
}

