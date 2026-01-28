import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_MATRICULAS = new Set([
  "521",
  "584",
  "140440",
  "160767",
  "690181",
  "690188",
  "770001",
]);

const ALLOWED_FUNCAO_TERMS = ["GERENTE", "COORDENADOR", "SUPERVISOR"];

const getMaskedName = (name?: string | null) => {
  const first = name?.trim().split(/\s+/)[0];
  if (!first) return "****";
  return `${first} ****`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matricula = searchParams.get("matricula")?.trim();

  if (!matricula) {
    return NextResponse.json(
      { error: "Matricula is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("colaboradores")
    .select("nome, filial, funcao")
    .eq("matricula", matricula)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Colaborador not found." },
      { status: 404 }
    );
  }

  const isAdmin = ADMIN_MATRICULAS.has(matricula);
  const funcaoUpper = (data.funcao ?? "").toUpperCase();
  const allowedByFuncao = ALLOWED_FUNCAO_TERMS.some((term) =>
    funcaoUpper.includes(term)
  );
  const allowSignup = isAdmin || allowedByFuncao;

  return NextResponse.json({
    nome: getMaskedName(data.nome),
    filial: data.filial ?? "",
    funcao: data.funcao ?? "",
    allowSignup,
    allowReason: allowSignup
      ? null
      : "Cadastro permitido apenas para gerente, coordenador ou supervisor.",
  });
}
