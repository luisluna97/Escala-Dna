type TurnstileResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstile(token: string, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing TURNSTILE_SECRET_KEY.");
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!res.ok) {
    return showsError("turnstile_unreachable");
  }

  const data = (await res.json()) as TurnstileResult;
  if (!data.success) {
    return showsError(data["error-codes"]?.join(",") || "turnstile_failed");
  }

  return { ok: true, error: null };
}

function showsError(code: string) {
  return { ok: false, error: code };
}
