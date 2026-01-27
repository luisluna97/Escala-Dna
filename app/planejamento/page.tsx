import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PlanejamentoClient from "./planejamento-client";

export default async function PlanejamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <PlanejamentoClient userId={user.id} />;
}

