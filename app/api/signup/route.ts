import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";

type SignupPayload = {
  matricula?: string;
  email?: string;
  password?: string;
  captchaToken?: string;
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
  const captchaToken = payload.captchaToken;

  if (!matricula || !email || !password || !captchaToken) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const captchaCheck = await verifyTurnstile(captchaToken);
  if (!captchaCheck.ok) {
    return NextResponse.json(
      { error: "Captcha validation failed." },
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
      emailRedirectTo: siteUrl ? `${siteUrl}/login` : undefined,
      data: {
        matricula: colaborador.matricula,
        nome: colaborador.nome,
        filial: colaborador.filial,
        funcao: colaborador.funcao,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "Signup created. Check your email to confirm.",
    userId: data.user?.id ?? null,
  });
}
