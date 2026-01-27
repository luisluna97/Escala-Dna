import Link from "next/link";

type ConfirmedPageProps = {
  searchParams?: {
    status?: string;
    next?: string;
  };
};

function getMessage(status: string) {
  switch (status) {
    case "success":
      return {
        title: "Cadastro confirmado",
        body: "Seu email foi validado com sucesso. Agora voce pode entrar.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "missing":
      return {
        title: "Link invalido",
        body: "O link de confirmacao esta incompleto ou expirou.",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "config-error":
      return {
        title: "Configuracao incompleta",
        body: "As variaveis do Supabase nao estao configuradas.",
        tone: "border-red-200 bg-red-50 text-red-700",
      };
    default:
      return {
        title: "Nao foi possivel confirmar",
        body: "Tente novamente pelo email mais recente ou fale com o admin.",
        tone: "border-red-200 bg-red-50 text-red-700",
      };
  }
}

export default function ConfirmedPage({ searchParams }: ConfirmedPageProps) {
  const status = searchParams?.status || "error";
  const next = searchParams?.next || "/login";
  const message = getMessage(status);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16">
      <div className={`w-full rounded-3xl border px-6 py-6 text-center ${message.tone}`}>
        <h1 className="font-display text-3xl font-semibold">{message.title}</h1>
        <p className="mt-2 text-sm">{message.body}</p>
      </div>

      <Link
        href={next}
        className="rounded-2xl bg-[hsl(var(--ink))] px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg"
      >
        Ir para login
      </Link>
    </div>
  );
}

