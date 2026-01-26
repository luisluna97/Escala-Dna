# Portal Dnata

Portal operacional para acompanhar batidas de ponto, hora extra e disponibilidade em tempo real.

## Stack

- Next.js (App Router)
- Supabase Auth + Postgres
- Tailwind CSS

## Setup rapido

1) Instale dependencias:
   - `npm install` (ou `pnpm install`)
2) Configure o `.env.local` com base em `.env.example`.
3) Rode o SQL do arquivo `supabase/setup.sql` no Supabase.
4) Inicie o app: `npm run dev`.

## Variaveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Fluxo de cadastro e login

- O cadastro exige matricula valida (tabela `colaboradores`) e captcha.
- O usuario recebe email de confirmacao antes de acessar o sistema.
- O login usa Supabase Auth (email + senha).

## Dashboard

O app chama a funcao `get_dashboard()` (baseada na `v_dashboard_v3`) para garantir que:
- usuarios veem apenas sua base
- admins e usuarios de `SEDE`/`HQ2` veem todas as bases

## Supabase

O arquivo `supabase/setup.sql` cria:
- tabela `profiles`
- trigger de `auth.users` para criar o perfil
- funcao `get_dashboard()` e grants

Para definir admins:
- atualize `profiles.role` para "admin"
