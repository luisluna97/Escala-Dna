-- Full setup: view + profiles + auth trigger + policies + dashboard function

create or replace view public.v_dashboard_v3 as
with colabs as (
  select
    c.matricula,
    c.nome,
    c.filial as colaborador_filial,
    c.carga_horaria,
    c.funcao,
    case
      when c.filial = 'MAO' then 'America/Manaus'
      else 'America/Sao_Paulo'
    end as tz,
    (timezone(
      case
        when c.filial = 'MAO' then 'America/Manaus'
        else 'America/Sao_Paulo'
      end,
      now()
    ))::date as base_date
  from colaboradores c
),
escala as (
  select
    c.matricula,
    (c.base_date + (h.horario1)::time without time zone) as entrada_escala,
    case
      when ((coalesce(h.horario4, h.horario2))::time without time zone < (h.horario1)::time without time zone)
        then ((c.base_date + '1 day'::interval) + ((coalesce(h.horario4, h.horario2))::time without time zone)::interval)
      else (c.base_date + (coalesce(h.horario4, h.horario2))::time without time zone)
    end as saida_escala
  from (colabs c
    join horarios h on (((c.matricula)::text = (h.matricula)::text)))
  where (to_date(h.data_escala, 'DD/MM/YYYY'::text) = c.base_date)
),
marcacoes_base as (
  select
    m.matricula,
    m.marcacao,
    c.base_date
  from marcacoes m
    join colabs c on (((m.matricula)::text = (c.matricula)::text))
),
marca_36h as (
  select
    m.matricula,
    m.marcacao
  from marcacoes_base m
  where ((m.marcacao >= (m.base_date - '02:00:00'::interval)) and (m.marcacao < (m.base_date + '24:00:00'::interval)))
),
ordenadas as (
  select
    m.matricula,
    m.marcacao,
    lag(m.marcacao) over (partition by m.matricula order by m.marcacao) as prev_marc,
    (extract(epoch from (m.marcacao - lag(m.marcacao) over (partition by m.matricula order by m.marcacao))) / (60)::numeric) as diff_min
  from marca_36h m
),
definir_cortes as (
  select
    o.matricula,
    o.marcacao,
    case
      when (o.prev_marc is null) then 1
      when (o.diff_min > (660)::numeric) then 1
      else 0
    end as novo_dia
  from ordenadas o
),
blocos as (
  select
    d.matricula,
    d.marcacao,
    sum(d.novo_dia) over (partition by d.matricula order by d.marcacao rows between unbounded preceding and current row) as bloco_id
  from definir_cortes d
),
ultimo_bloco as (
  select
    blocos.matricula,
    max(blocos.bloco_id) as bloco_final
  from blocos
  group by blocos.matricula
),
filtrado as (
  select
    b.matricula,
    b.marcacao,
    b.bloco_id
  from (blocos b
    join ultimo_bloco u on ((((b.matricula)::text = (u.matricula)::text) and (b.bloco_id = u.bloco_final))))
),
enumerar as (
  select
    f.matricula,
    f.marcacao,
    row_number() over (partition by f.matricula order by f.marcacao) as rn
  from filtrado f
),
map_batidas as (
  select
    e.matricula,
    max(case when (e.rn = 1) then e.marcacao else null::timestamp without time zone end) as b1,
    max(case when (e.rn = 2) then e.marcacao else null::timestamp without time zone end) as b2,
    max(case when (e.rn = 3) then e.marcacao else null::timestamp without time zone end) as b3,
    max(case when (e.rn = 4) then e.marcacao else null::timestamp without time zone end) as b4
  from enumerar e
  group by e.matricula
),
base_join as (
  select
    es.matricula,
    c.nome,
    c.colaborador_filial,
    c.carga_horaria,
    c.funcao,
    c.tz,
    es.entrada_escala,
    es.saida_escala,
    mb.b1 as entrada1,
    mb.b2 as saida1,
    mb.b3 as entrada2,
    mb.b4 as saida2
  from ((escala es
    join colabs c on (((es.matricula)::text = (c.matricula)::text)))
    left join map_batidas mb on (((es.matricula)::text = (mb.matricula)::text)))
),
calc0 as (
  select
    b.matricula,
    b.nome,
    b.colaborador_filial,
    b.carga_horaria,
    b.funcao,
    b.tz,
    b.entrada_escala,
    b.saida_escala,
    b.entrada1,
    b.saida1,
    b.entrada2,
    b.saida2,
    case
      when ((b.saida_escala is null) or (b.entrada_escala is null)) then (0)::numeric
      when (b.saida_escala < b.entrada_escala)
        then (extract(epoch from ((b.saida_escala + '1 day'::interval) - b.entrada_escala)) / 3600.0)
      else (extract(epoch from (b.saida_escala - b.entrada_escala)) / 3600.0)
    end as expected_hours,
    case
      when ((b.carga_horaria = any (array[180, 210, 220])) and (b.entrada2 is not null) and (b.saida1 is not null))
        then (extract(epoch from (b.entrada2 - b.saida1)) / (60)::numeric)
      else (0)::numeric
    end as intervalo_min
  from base_join b
),
calc1 as (
  select
    c.matricula,
    c.nome,
    c.colaborador_filial,
    c.carga_horaria,
    c.funcao,
    c.tz,
    c.entrada_escala,
    c.saida_escala,
    c.entrada1,
    c.saida1,
    c.entrada2,
    c.saida2,
    c.expected_hours,
    c.intervalo_min,
    case
      when (c.carga_horaria <> all (array[180, 210, 220])) then
        case
          when (c.entrada1 is null) then (0)::numeric
          when ((c.entrada1 is not null) and (c.saida1 is null))
            then (extract(epoch from (timezone(c.tz, now()) - c.entrada1)) / 3600.0)
          else (extract(epoch from (c.saida1 - c.entrada1)) / 3600.0)
        end
      else
        case
          when (c.entrada1 is null) then (0)::numeric
          when ((c.entrada1 is not null) and (c.saida1 is null) and (c.entrada2 is null) and (c.saida2 is null))
            then (extract(epoch from (timezone(c.tz, now()) - c.entrada1)) / 3600.0)
          when ((c.entrada1 is not null) and (c.saida1 is not null) and (c.entrada2 is null) and (c.saida2 is null))
            then (extract(epoch from (c.saida1 - c.entrada1)) / 3600.0)
          when ((c.entrada1 is not null) and (c.saida1 is not null) and (c.entrada2 is not null) and (c.saida2 is null))
            then ((extract(epoch from (c.saida1 - c.entrada1)) + extract(epoch from (timezone(c.tz, now()) - c.entrada2))) / 3600.0)
          when ((c.entrada1 is not null) and (c.saida1 is not null) and (c.entrada2 is not null) and (c.saida2 is not null))
            then ((extract(epoch from (c.saida1 - c.entrada1)) + extract(epoch from (c.saida2 - c.entrada2))) / 3600.0)
          else (0)::numeric
        end
    end as horas_trabalhadas
  from calc0 c
),
calc2 as (
  select
    c.matricula,
    c.nome,
    c.colaborador_filial,
    c.carga_horaria,
    c.funcao,
    c.tz,
    c.entrada_escala,
    c.saida_escala,
    c.entrada1,
    c.saida1,
    c.entrada2,
    c.saida2,
    c.expected_hours,
    c.intervalo_min,
    c.horas_trabalhadas,
    greatest((0)::numeric, (c.horas_trabalhadas - c.expected_hours)) as hora_extra
  from calc1 c
),
final as (
  select
    c.matricula,
    c.nome,
    c.colaborador_filial,
    c.carga_horaria,
    c.funcao,
    c.tz,
    c.entrada_escala,
    c.saida_escala,
    c.entrada1,
    c.saida1,
    c.entrada2,
    c.saida2,
    c.expected_hours,
    c.intervalo_min,
    c.horas_trabalhadas,
    c.hora_extra,
    case
      when (c.entrada1 is null) then 'aguardando'::text
      when (((c.carga_horaria <> all (array[180, 210, 220])) and (c.saida1 is null)) or ((c.carga_horaria = any (array[180, 210, 220])) and (c.saida2 is null)))
        then case
          when (c.hora_extra > (0)::numeric) then 'trabalhando em hora extra'::text
          else 'trabalhando ok'::text
        end
      else
        case
          when (c.hora_extra > (0)::numeric) then 'finalizado com hora extra'::text
          else 'finalizado ok'::text
        end
    end as status
  from calc2 c
),
madruga as (
  select distinct m.matricula
  from marcacoes_base m
  where ((m.marcacao >= (m.base_date - '02:00:00'::interval)) and (m.marcacao < (m.base_date + '06:00:00'::interval)))
),
total_12h as (
  select
    m.matricula,
    count(*) as total_batidas
  from marcacoes_base m
  where ((m.marcacao >= (m.base_date - '12:00:00'::interval)) and (m.marcacao < (m.base_date + '1 day'::interval)))
  group by m.matricula
),
final2 as (
  select
    f.matricula,
    f.nome,
    f.colaborador_filial,
    f.carga_horaria,
    f.funcao,
    f.entrada_escala,
    f.saida_escala,
    f.entrada1,
    f.saida1,
    f.entrada2,
    f.saida2,
    f.expected_hours,
    f.intervalo_min,
    f.horas_trabalhadas,
    f.hora_extra,
    f.status
  from ((final f
    left join madruga md on (((f.matricula)::text = (md.matricula)::text)))
    left join total_12h t12 on (((f.matricula)::text = (t12.matricula)::text)))
  where ((md.matricula is null) or ((md.matricula is not null) and (not ((coalesce(t12.total_batidas, (0)::bigint) > 0) and ((coalesce(t12.total_batidas, (0)::bigint) % (2)::bigint) = 0)))))
)
select
  final2.matricula,
  final2.nome,
  final2.colaborador_filial,
  final2.carga_horaria,
  final2.funcao,
  final2.entrada_escala,
  final2.saida_escala,
  final2.entrada1,
  final2.saida1,
  final2.entrada2,
  final2.saida2,
  final2.intervalo_min,
  final2.horas_trabalhadas,
  final2.expected_hours,
  final2.hora_extra,
  final2.status
from final2;

-- Profiles table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  matricula varchar(50) not null unique,
  nome varchar(200),
  filial varchar(100),
  funcao varchar(200),
  role text not null default 'user',
  criado_em timestamp without time zone default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;

-- Create profile on signup and block invalid matricula
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula text;
  v_nome text;
  v_filial text;
  v_funcao text;
begin
  v_matricula := new.raw_user_meta_data ->> 'matricula';
  if v_matricula is null or v_matricula = '' then
    raise exception 'matricula_missing';
  end if;

  select nome, filial, funcao
    into v_nome, v_filial, v_funcao
  from public.colaboradores
  where matricula = v_matricula;

  if v_nome is null then
    raise exception 'matricula_not_found';
  end if;

  insert into public.profiles (id, matricula, nome, filial, funcao, role)
  values (new.id, v_matricula, v_nome, v_filial, v_funcao, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Secure dashboard access by base + role
create or replace function public.get_dashboard()
returns setof public.v_dashboard_v3
language sql
security definer
set search_path = public
as $$
  select v.*
  from public.v_dashboard_v3 v
  join public.profiles p on p.id = auth.uid()
  where auth.uid() is not null
    and (
      p.role = 'admin'
      or p.filial in ('SEDE', 'HQ2')
      or v.colaborador_filial = p.filial
    );
$$;

revoke all on function public.get_dashboard() from public;
grant execute on function public.get_dashboard() to authenticated;

do $$
begin
  if to_regclass('public.v_dashboard_v2') is not null then
    execute 'revoke all on public.v_dashboard_v2 from anon, authenticated';
  end if;
end $$;

revoke all on public.v_dashboard_v3 from anon, authenticated;
