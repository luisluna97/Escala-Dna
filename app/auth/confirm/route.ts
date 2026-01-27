import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/login";

  const redirectTo = (status: string) => {
    const url = new URL("/auth/confirmed", requestUrl.origin);
    url.searchParams.set("status", status);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (!tokenHash || !type) {
    return redirectTo("missing");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return redirectTo("config-error");
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return redirectTo("error");
  }

  return redirectTo("success");
}

