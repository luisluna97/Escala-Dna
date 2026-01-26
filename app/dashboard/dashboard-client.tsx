"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

const basesOptions = [
  "BVB",
  "CPV",
  "IGU",
  "THE",
  "JJD",
  "PNZ",
  "FOR",
  "JDO",
  "VCP",
  "GIG",
  "JPA",
  "GRU",
  "SSA",
  "SEDE",
  "REC",
  "CWB",
  "MCZ",
  "BEL",
  "AJU",
  "MCP",
  "STM",
  "SLZ",
  "BSB",
  "FLN",
  "NAT",
  "IOS",
  "MAO",
  "BPS",
  "POA",
  "FEN",
  "CGH",
  "HQ2",
];

const statusOptions = [
  "todas",
  "aguardando",
  "trabalhando em hora extra",
  "trabalhando ok",
  "finalizado ok",
  "finalizado com hora extra",
];

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

function getStatusBadge(status: string | null) {
  switch (status) {
    case "aguardando":
      return "bg-amber-100 text-amber-800";
    case "trabalhando em hora extra":
      return "bg-red-100 text-red-700";
    case "trabalhando ok":
      return "bg-emerald-100 text-emerald-700";
    case "finalizado ok":
      return "bg-blue-100 text-blue-700";
    case "finalizado com hora extra":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isFullTime(carga: number | null) {
  if (carga == null) return false;
  return [180, 210, 220].includes(carga);
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

    const { data: rows, error: fetchError } = await supabase.rpc(
      "get_dashboard"
    );

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setData((rows ?? []) as DashboardRow[]);
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
        setSelectedBase(profileData.filial);
      }
    };

    loadProfile();
  }, [supabase, userId]);

  useEffect(() => {
    if (!profile) return;

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);

    return () => clearInterval(interval);
  }, [profile, fetchDashboard]);

  const canViewAllBases =
    profile?.role === "admin" ||
    profile?.filial === "SEDE" ||
    profile?.filial === "HQ2";

  const mappedData = useMemo<DashboardRowWithGroup[]>(() => {
    return data.map((row) => ({
      ...row,
      funcaoGrupo: getFuncaoGrupo(row.funcao || "", row.colaborador_filial || ""),
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    return mappedData.filter((row) => {
      const baseOk = canViewAllBases
        ? selectedBase
          ? row.colaborador_filial === selectedBase
          : true
        : row.colaborador_filial === profile?.filial;

      const statusOk =
        selectedStatus === "todas" || row.status === selectedStatus;

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

      return baseOk && statusOk && contratoOk && groupOk && searchOk;
    });
  }, [
    mappedData,
    canViewAllBases,
    selectedBase,
    selectedStatus,
    selectedContrato,
    selectedGroups,
    search,
    profile?.filial,
  ]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pt-8">
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
                  {basesOptions.map((base) => (
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
                  <option key={status} value={status}>
                    {status}
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

          <div className="mt-4 space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              Grupo de funcao
            </label>
            <select
              multiple
              value={selectedGroups}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions,
                  (opt) => opt.value
                );
                if (values.includes("todas") && values.length === 1) {
                  setSelectedGroups(["todas"]);
                } else {
                  setSelectedGroups(values.length ? values : ["todas"]);
                }
              }}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[hsl(var(--brand))] focus:ring-2 focus:ring-[hsl(var(--brand))/0.2]"
            >
              {funcaoGruposOptions.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="glass soft-shadow overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/90 text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  {[
                    { key: "nome", label: "Nome" },
                    { key: "matricula", label: "Matricula" },
                    { key: "funcao", label: "Funcao" },
                    { key: "colaborador_filial", label: "Base" },
                    { key: "carga_horaria", label: "Carga" },
                    { key: "entrada_escala", label: "E escala" },
                    { key: "saida_escala", label: "S escala" },
                    { key: "entrada1", label: "E1" },
                    { key: "saida1", label: "S1" },
                    { key: "entrada2", label: "E2" },
                    { key: "saida2", label: "S2" },
                    { key: "horas_trabalhadas", label: "H trab" },
                    { key: "hora_extra", label: "H extra" },
                    { key: "status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() =>
                        handleSort(col.key as keyof DashboardRow)
                      }
                      className="cursor-pointer whitespace-nowrap px-4 py-3"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/70">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={14}>
                      Carregando dados...
                    </td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={14}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => (
                    <tr
                      key={`${row.matricula}-${index}`}
                      className="border-t border-black/5"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        {row.nome}
                      </td>
                      <td className="px-4 py-3">{row.matricula}</td>
                      <td className="px-4 py-3">{row.funcao}</td>
                      <td className="px-4 py-3">{row.colaborador_filial}</td>
                      <td className="px-4 py-3">{row.carga_horaria}</td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.entrada_escala)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.saida_escala)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.entrada1)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.saida1)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.entrada2)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(row.saida2)}
                      </td>
                      <td className="px-4 py-3">
                        {decimalHoursToHHMM(row.horas_trabalhadas)}
                      </td>
                      <td className="px-4 py-3">
                        {decimalHoursToHHMM(row.hora_extra)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                            row.status
                          )}`}
                        >
                          {row.status || "-"}
                        </span>
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
