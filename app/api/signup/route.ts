import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
const IGNORED_PARTICLES = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

type SignupPayload = {
  matricula?: string;
  email?: string;
  password?: string;
  lastName?: string;
  captchaToken?: string;
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const getLastMeaningfulName = (name: string) => {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (!IGNORED_PARTICLES.has(parts[i])) {
      return parts[i];
    }
  }
  return "";
};

export async function POST(request: Request) {
  let payload: SignupPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const matricula = payload.matricula?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;
  const lastName = payload.lastName?.trim();
  const captchaToken = payload.captchaToken?.trim();

  if (!matricula || !email || !password || !lastName || !captchaToken) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: colaborador, error: colabError } = await admin
    .from("colaboradores")
    .select("matricula, nome, filial, funcao")
    .eq("matricula", matricula)
    .single();

  if (colabError || !colaborador) {
    return NextResponse.json(
      { error: "Matricula not found in colaboradores." },
      { status: 400 }
    );
  }

  const expectedLastName = getLastMeaningfulName(colaborador.nome ?? "");
  if (!expectedLastName) {
    return NextResponse.json({ error: "Nome invalido." }, { status: 400 });
  }

  if (normalizeName(lastName) !== expectedLastName) {
    return NextResponse.json(
      { error: "Ultimo sobrenome nao confere." },
      { status: 422 }
    );
  }

  const isAdmin = ADMIN_MATRICULAS.has(colaborador.matricula);
  const funcaoUpper = (colaborador.funcao ?? "").toUpperCase();
  const allowedByFuncao = ALLOWED_FUNCAO_TERMS.some((term) =>
    funcaoUpper.includes(term)
  );

  if (!isAdmin && !allowedByFuncao) {
    return NextResponse.json(
      {
        error:
          "Cadastro permitido apenas para gerente, coordenador ou supervisor.",
      },
      { status: 403 }
    );
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("matricula", matricula)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      { error: "Matricula already registered." },
      { status: 409 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Missing Supabase config." },
      { status: 500 }
    );
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/confirm` : undefined,
      captchaToken,
      data: {
        matricula: colaborador.matricula,
        nome: colaborador.nome,
        filial: colaborador.filial,
        funcao: colaborador.funcao,
        role: isAdmin ? "admin" : "user",
      },
    },
  });

  if (error) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          name: error.name,
          status: error.status ?? 400,
        },
      },
      { status: error.status ?? 400 }
    );
  }

  return NextResponse.json({
    message: "Signup created.",
    userId: data.user?.id ?? null,
  });
}
