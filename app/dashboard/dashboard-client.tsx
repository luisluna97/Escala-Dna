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

type DashboardRow = {
  matricula: string | null;
  nome: string | null;
  colaborador_filial: string | null;
  carga_horaria: number | null;
  funcao: string | null;
  entrada_escala: string | null;
  saida_escala: string | null;
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  intervalo_min: number | null;
  horas_trabalhadas: number | null;
  expected_hours: number | null;
  hora_extra: number | null;
  status: string | null;
};

type DashboardRowWithGroup = DashboardRow & { funcaoGrupo: string };

const statusOptions = [
  { value: "todas", label: "Todos" },
  { value: "trabalhando em hora extra", label: "Em hora extra" },
  { value: "trabalhando ok", label: "Em jornada" },
  { value: "finalizado com hora extra", label: "Finalizado c/ HE" },
  { value: "finalizado ok", label: "Finalizado" },
];

const statusLabels: Record<string, string> = {
  aguardando: "Sem batida",
  "trabalhando em hora extra": "Em hora extra",
  "trabalhando ok": "Em jornada",
  "finalizado ok": "Finalizado",
  "finalizado com hora extra": "Finalizado c/ HE",
};

const funcaoGruposOptions = [
  "todas",
  "PAX",
  "LIDER",
  "RAMPA",
  "LIMPEZA",
  "OPERADOR",
  "SECURITY",
  "GSE",
  "SUPERVISOR",
  "OUTROS",
];

function getFuncaoGrupo(funcao = "", filial = "") {
  const fUp = funcao.toUpperCase();
  const filUp = filial.toUpperCase();

  if (filUp === "SEDE" || filUp === "HQ2") return "OUTROS";
  if (
    fUp.includes("PASSAG") ||
    fUp.includes("PAX") ||
    fUp.includes("BALANCEIRO") ||
    fUp.includes("AGENTE DE PESO") ||
    fUp.includes("ATEND")
  ) {
    return "PAX";
  }
  if (
    fUp.includes("LIDER DE OPERACOES") ||
    fUp.includes("LIDER DE RAMPA") ||
    fUp.includes("LOADMASTER")
  ) {
    return "LIDER";
  }
  if (fUp.includes("RAMPA") || fUp.includes("LOGISTICA")) {
    return "RAMPA";
  }
  if (fUp.includes("LIMPEZA")) {
    return "LIMPEZA";
  }
  if (fUp.includes("OPERADOR")) {
    return "OPERADOR";
  }
  if (fUp.includes("SECURITY") || fUp.includes("PROTECAO")) {
    return "SECURITY";
  }
  if (
    fUp.includes("MANUTENCAO") ||
    fUp.includes("MECANICO") ||
    fUp.includes("ELETRICISTA") ||
    fUp.includes("MONTADOR") ||
    fUp.includes("PINTOR") ||
    fUp.includes("SERRALHEIRO") ||
    fUp.includes("SOLDADOR") ||
    fUp.includes("TECNICO") ||
    fUp.includes("OFICINA")
  ) {
    return "GSE";
  }
  if (fUp.includes("SUPERVISOR DE AEROPORTO") || fUp.includes("SUPERVISOR")) {
    return "SUPERVISOR";
  }
  return "OUTROS";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function decimalHoursToHHMM(value: number | null) {
  if (value == null) return "-";
  const totalMinutes = Math.floor(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function formatPair(
  start: string | null,
  end: string | null,
  divider = " / "
) {
  return `${formatDateTime(start)}${divider}${formatDateTime(end)}`;
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "aguardando":
      return "bg-amber-500";
    case "trabalhando em hora extra":
      return "bg-red-500";
    case "trabalhando ok":
      return "bg-emerald-500";
    case "finalizado ok":
      return "bg-blue-500";
    case "finalizado com hora extra":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function getStatusLabel(status: string | null) {
  if (!status) return "-";
  return statusLabels[status] ?? status;
}

function isFullTime(carga: number | null) {
  if (carga == null) return false;
  return [180, 210, 220].includes(carga);
}

function hasAnyPunch(row: DashboardRow) {
  return Boolean(row.entrada1 || row.saida1 || row.entrada2 || row.saida2);
}

export default function DashboardClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [selectedBase, setSelectedBase] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todas");
  const [selectedContrato, setSelectedContrato] = useState("todas");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["todas"]);

  const [sortColumn, setSortColumn] = useState<keyof DashboardRow>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const pageSize = 1000;
    const allRows: DashboardRow[] = [];
    let from = 0;
    let fetchError: string | null = null;

    while (fetchError === null) {
      const { data: rows, error } = await supabase
        .rpc("get_dashboard")
        .range(from, from + pageSize - 1);

      if (error) {
        fetchError = error.message;
        break;
      }

      const page = (rows ?? []) as DashboardRow[];
      allRows.push(...page);

      if (page.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    setData(allRows);
    setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    setLoading(false);
  }, [supabase]);

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
      if (
        profileData?.filial &&
        !["SEDE", "HQ2"].includes(profileData.filial)
      ) {
        setSelectedBase(profileData.filial.toUpperCase());
      }
    };

    loadProfile();
  }, [supabase, userId]);

  useEffect(() => {
    if (!profile) return;

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [profile, fetchDashboard]);

  const canViewAllBases =
    profile?.role === "admin" ||
    profile?.filial === "SEDE" ||
    profile?.filial === "HQ2";

  const baseOptions = useMemo(() => {
    const blocked = new Set(["SEDE", "HQ2"]);
    const bases = new Set<string>();

    data.forEach((row) => {
      const base = row.colaborador_filial?.trim().toUpperCase();
      if (!base || blocked.has(base)) return;
      bases.add(base);
    });

    return Array.from(bases).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const mappedData = useMemo<DashboardRowWithGroup[]>(() => {
    return data.map((row) => ({
      ...row,
      funcaoGrupo: getFuncaoGrupo(row.funcao || "", row.colaborador_filial || ""),
    }));
  }, [data]);

  const scopedData = useMemo(() => {
    return mappedData.filter((row) => {
      if (!hasAnyPunch(row)) return false;

      const rowBase = row.colaborador_filial?.trim().toUpperCase() || "";
      const profileBase = profile?.filial?.trim().toUpperCase() || "";

      const baseOk = canViewAllBases
        ? selectedBase
          ? rowBase === selectedBase
          : true
        : rowBase === profileBase;

      const contratoOk =
        selectedContrato === "todas" ||
        (selectedContrato === "full" && isFullTime(row.carga_horaria)) ||
        (selectedContrato === "part" && !isFullTime(row.carga_horaria));

      const groupOk =
        selectedGroups.includes("todas") ||
        selectedGroups.includes(row.funcaoGrupo);

      const searchValue = search.trim().toLowerCase();
      const searchOk =
        !searchValue ||
        (row.nome || "").toLowerCase().includes(searchValue) ||
        (row.matricula || "").toLowerCase().includes(searchValue);

      return baseOk && contratoOk && groupOk && searchOk;
    });
  }, [
    mappedData,
    canViewAllBases,
    selectedBase,
    selectedContrato,
    selectedGroups,
    search,
    profile?.filial,
  ]);

  const filteredData = useMemo(() => {
    if (selectedStatus === "todas") return scopedData;
    return scopedData.filter((row) => row.status === selectedStatus);
  }, [scopedData, selectedStatus]);

  const sortedData = useMemo(() => {
    const rows = [...filteredData];
    rows.sort((a, b) => {
      const valA = a[sortColumn] ? a[sortColumn]!.toString().toLowerCase() : "";
      const valB = b[sortColumn] ? b[sortColumn]!.toString().toLowerCase() : "";
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (column: keyof DashboardRow) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const totalRegistros = filteredData.length;
  const totalExtra = filteredData.reduce((acc, row) => {
    if (!row.hora_extra) return acc;
    return acc + row.hora_extra;
  }, 0);

  const heAtivos = scopedData.filter(
    (row) => row.status === "trabalhando em hora extra"
  ).length;
  const emJornada = scopedData.filter(
    (row) => row.status === "trabalhando ok"
  ).length;
  const finalizados = scopedData.filter((row) =>
    row.status?.startsWith("finalizado")
  ).length;

  const resetFilters = () => {
    setSearch("");
    setSelectedStatus("todas");
    setSelectedContrato("todas");
    setSelectedGroups(["todas"]);
    if (canViewAllBases) {
      setSelectedBase("");
    } else if (profile?.filial) {
      setSelectedBase(profile.filial.toUpperCase());
    }
  };

  const toggleGroup = (group: string) => {
    if (group === "todas") {
      setSelectedGroups(["todas"]);
      return;
    }

    const withoutAll = selectedGroups.filter((item) => item !== "todas");
    const next = withoutAll.includes(group)
      ? withoutAll.filter((item) => item !== group)
      : [...withoutAll, group];

    setSelectedGroups(next.length ? next : ["todas"]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Dashboard operacional
              </p>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Hora extra e disponibilidade
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboard}
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

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass soft-shadow rounded-3xl p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Perfil ativo
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {profile?.nome || "Usuario"}
                </h2>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                  {profile?.filial || "SEM BASE"}
                </span>
                {profile?.role === "admin" && (
                  <span className="rounded-full bg-[hsl(var(--brand))/0.15] px-3 py-1 text-xs font-semibold text-[hsl(var(--brand))]">
                    admin
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">
                Ultima atualizacao: {lastUpdated || "-"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                  HE ativa: {heAtivos}
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  Em jornada: {emJornada}
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                  Finalizados: {finalizados}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass soft-shadow rounded-3xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Registros
              </p>
              <p className="font-display text-3xl font-semibold text-ink">
                {totalRegistros}
              </p>
            </div>
            <div className="glass soft-shadow rounded-3xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Hora extra total
              </p>
              <p className="font-display text-3xl font-semibold text-ink">
                {decimalHoursToHHMM(totalExtra)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass soft-shadow rounded-3xl p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Busca
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
                placeholder="Nome ou matricula"
              />
            </div>

            {canViewAllBases && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted">
                  Base
                </label>
                <select
                  value={selectedBase}
                  onChange={(event) => setSelectedBase(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
                >
                  <option value="">Todas</option>
                  {baseOptions.map((base) => (
                    <option key={base} value={base}>
                      {base}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted">
                Contrato
              </label>
              <select
                value={selectedContrato}
                onChange={(event) => setSelectedContrato(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
              >
                <option value="todas">Todas</option>
                <option value="full">Full-time</option>
                <option value="part">Part-time</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus("trabalhando em hora extra")}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700 transition hover:-translate-y-0.5"
            >
              So HE
            </button>
            <button
              onClick={() => setSelectedStatus("trabalhando ok")}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:-translate-y-0.5"
            >
              Em jornada
            </button>
            <button
              onClick={resetFilters}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-ink"
            >
              Limpar filtros
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Grupo de funcao
            </label>
            <div className="flex flex-wrap gap-2">
              {funcaoGruposOptions.map((group) => {
                const active = selectedGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
                      active
                        ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))/0.12] text-[hsl(var(--brand))]"
                        : "border-black/10 bg-white text-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="glass soft-shadow overflow-hidden rounded-3xl">
          <div className="overflow-x-hidden">
            <table className="min-w-full table-auto text-left text-xs">
              <thead className="bg-white/90 text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  {[
                    { key: "nome", label: "Nome" },
                    { key: "matricula", label: "Matricula" },
                    { key: "funcao", label: "Funcao" },
                    { key: "colaborador_filial", label: "Base" },
                    { key: "carga_horaria", label: "Carga" },
                    { key: "entrada_escala", label: "Escala" },
                    { key: "entrada1", label: "Batidas" },
                    { key: "entrada2", label: "Retorno" },
                    { key: "horas_trabalhadas", label: "H trab" },
                    { key: "hora_extra", label: "H extra" },
                    { key: "status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() =>
                        handleSort(col.key as keyof DashboardRow)
                      }
                      className="cursor-pointer whitespace-nowrap px-3 py-3"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/70">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={11}>
                      Carregando dados...
                    </td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={11}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => (
                    <tr
                      key={`${row.matricula}-${index}`}
                      className="border-t border-black/5"
                    >
                      <td className="px-3 py-3 font-medium text-ink">
                        <div className="max-w-[220px] whitespace-normal break-words">
                          {row.nome}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[110px] whitespace-normal break-words">
                          {row.matricula}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[200px] whitespace-normal break-words">
                          {row.funcao}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[90px] whitespace-normal break-words">
                          {row.colaborador_filial}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[80px] whitespace-normal break-words">
                          {row.carga_horaria}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px] text-muted">
                        {formatPair(row.entrada_escala, row.saida_escala, " → ")}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px] text-muted">
                        {formatPair(row.entrada1, row.saida1)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px] text-muted">
                        {formatPair(row.entrada2, row.saida2)}
                      </td>
                      <td className="px-3 py-3">
                        {decimalHoursToHHMM(row.horas_trabalhadas)}
                      </td>
                      <td className="px-3 py-3">
                        {decimalHoursToHHMM(row.hora_extra)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${getStatusBadge(
                              row.status
                            )}`}
                          />
                          <span className="text-xs font-semibold text-ink/80">
                            {getStatusLabel(row.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
