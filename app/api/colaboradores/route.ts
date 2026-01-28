import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

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

  return NextResponse.json({
    nome: getMaskedName(data.nome),
    filial: data.filial ?? "",
    funcao: data.funcao ?? "",
  });
}
