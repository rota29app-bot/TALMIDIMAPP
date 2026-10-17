CREATE OR REPLACE FUNCTION public.get_church_average_radar()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
  caller_igreja uuid;
  result json;
begin
  select role, igreja_id into caller_role, caller_igreja from user_roles where user_id = auth.uid();
  if caller_role is distinct from 'pastor' then
    raise exception 'Acesso negado.';
  end if;
  select json_build_object(
    'score_intimacy', coalesce(avg(r.score_intimidade), 0),
    'score_family', coalesce(avg(r.score_familia), 0),
    'score_evangelism', coalesce(avg(r.score_evangelizacao), 0),
    'score_compassion', coalesce(avg(r.score_compaixao), 0),
    'score_stewardship', coalesce(avg(r.score_mordomia), 0),
    'score_service', coalesce(avg(r.score_servico), 0),
    'score_communion', coalesce(avg(r.score_comunhao), 0),
    'total_radars', count(*)
  ) into result
  from (select distinct on (user_id) * from public.user_radars order by user_id, created_at desc) r
  join public.user_roles ur on ur.user_id = r.user_id
  where ur.igreja_id = caller_igreja;
  return result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_church_total_disciples()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
  caller_igreja uuid;
  total_users integer := 0;
begin
  select role, igreja_id into caller_role, caller_igreja from user_roles where user_id = auth.uid();
  if caller_role is distinct from 'pastor' then
    raise exception 'Acesso negado.';
  end if;
  select count(distinct p.user_id) into total_users
  from public.user_pdds p
  join public.user_roles ur on ur.user_id = p.user_id
  where ur.igreja_id = caller_igreja;
  return total_users;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_church_prayer_targets()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
  caller_igreja uuid;
  total_targets integer := 0;
begin
  select role, igreja_id into caller_role, caller_igreja from user_roles where user_id = auth.uid();
  if caller_role is distinct from 'pastor' then
    raise exception 'Acesso negado: Apenas pastores podem visualizar métricas agregadas da igreja.';
  end if;

  -- priority_areas é uma string separada por vírgula (ex: 'familia,mordomia').
  -- Conta o total de áreas de foco registradas por todos os membros da igreja.
  select coalesce(sum(
    array_length(string_to_array(nullif(trim(p.priority_areas), ''), ','), 1)
  ), 0) into total_targets
  from public.user_pdds p
  join public.user_roles ur on ur.user_id = p.user_id
  where ur.igreja_id = caller_igreja;

  return total_targets;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_church_members()
 RETURNS TABLE(user_id uuid, nome text, email text, estacao_atual integer, ultima_atividade timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
  caller_igreja uuid;
begin
  select ur.role, ur.igreja_id into caller_role, caller_igreja
  from public.user_roles ur where ur.user_id = auth.uid();

  if caller_role is distinct from 'pastor' then
    raise exception 'Acesso negado: apenas pastores podem ver a lista de membros.';
  end if;

  return query
  select
    u.id as user_id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email)::text as nome,
    u.email::text,
    coalesce(su.current_stage_index, 0) as estacao_atual,
    greatest(u.last_sign_in_at, su.updated_at, dp.max_updated_at) as ultima_atividade
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  left join public.user_stage_unlocks su on su.user_id = ur.user_id
  left join (
    select udp.user_id, max(udp.updated_at) as max_updated_at
    from public.user_daily_progress udp
    group by udp.user_id
  ) dp on dp.user_id = ur.user_id
  where ur.igreja_id = caller_igreja
    and ur.role = 'membro'
  order by ultima_atividade desc nulls last, nome asc;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_get_all_members()
 RETURNS TABLE(user_id uuid, nome text, email text, igreja_id uuid, igreja_nome text, role text, genero text, estado text, cidade text, idade integer, estacao_atual integer, dia_estacao_atual integer, ultima_atividade timestamp with time zone, radar_preenchido boolean, radar_pontuacao integer, pdd_preenchido boolean, criado_em timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  is_admin boolean;
begin
  select ur.is_super_admin into is_admin from public.user_roles ur where ur.user_id = auth.uid();
  if is_admin is distinct from true then
    raise exception 'Acesso negado: apenas administradores do sistema.';
  end if;

  return query
  with stage_map(idx, sid) as (
    values (0,'house'),(1,'street'),(2,'clinic'),(3,'office'),(4,'construction'),(5,'rooftop'),(6,'city')
  ),
  ultima as (
    select udp.user_id, max(udp.updated_at) as max_updated_at
    from public.user_daily_progress udp
    group by udp.user_id
  ),
  dia_atual as (
    select distinct on (dp.user_id) dp.user_id, dp.day_index
    from public.user_daily_progress dp
    join public.user_stage_unlocks su2 on su2.user_id = dp.user_id
    join stage_map sm on sm.idx = su2.current_stage_index and sm.sid = dp.stage_id
    order by dp.user_id, dp.updated_at desc
  ),
  radar as (
    select distinct on (r.user_id) r.user_id,
           (r.score_intimidade + r.score_familia + r.score_evangelizacao + r.score_compaixao + r.score_mordomia + r.score_servico + r.score_comunhao) as pontuacao
    from public.user_radars r
    order by r.user_id, r.created_at desc
  ),
  pdd as (
    select distinct p.user_id from public.user_pdds p
  )
  select
    u.id as user_id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email)::text as nome,
    u.email::text,
    ur.igreja_id,
    i.nome as igreja_nome,
    ur.role,
    (u.raw_user_meta_data->>'profile')::text as genero,
    ur.estado,
    ur.cidade,
    ur.idade,
    coalesce(su.current_stage_index, 0) as estacao_atual,
    da.day_index as dia_estacao_atual,
    greatest(u.last_sign_in_at, su.updated_at, ult.max_updated_at) as ultima_atividade,
    (rad.user_id is not null) as radar_preenchido,
    rad.pontuacao as radar_pontuacao,
    (pdd.user_id is not null) as pdd_preenchido,
    u.created_at as criado_em
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  left join public.igrejas i on i.id = ur.igreja_id
  left join public.user_stage_unlocks su on su.user_id = ur.user_id
  left join ultima ult on ult.user_id = ur.user_id
  left join dia_atual da on da.user_id = ur.user_id
  left join radar rad on rad.user_id = ur.user_id
  left join pdd on pdd.user_id = ur.user_id
  order by ultima_atividade desc nulls last, nome asc;
end;
$function$
;

create table public.pilot_records (
 id uuid primary key default gen_random_uuid(),
 igreja_id uuid not null references public.igrejas(id),
 kind text not null check (kind in ('igreja','ocorrencia','experiencia','comercial')),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 20000),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
alter table public.pilot_records enable row level security;
revoke all on public.pilot_records from public, anon, authenticated;
grant select, insert on public.pilot_records to authenticated;
create policy admin_read_pilot on public.pilot_records for select to authenticated
 using (exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin));
create policy admin_record_pilot on public.pilot_records for insert to authenticated
 with check (created_by=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin));
create index pilot_records_church_date on public.pilot_records(igreja_id,created_at desc);

create table public.pilot_activity (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_day date not null default (now() at time zone 'America/Sao_Paulo')::date,
 primary key(user_id,activity_day)
);
alter table public.pilot_activity enable row level security;
revoke all on public.pilot_activity from public, anon, authenticated;
create function public.record_pilot_activity() returns void language plpgsql security definer set search_path=public as $fn$
begin
 if auth.uid() is null then raise exception 'Não autenticado.'; end if;
 if exists(select 1 from public.user_roles where user_id=auth.uid() and role='membro' and not is_super_admin) then
 insert into public.pilot_activity(user_id) values(auth.uid()) on conflict do nothing;
 end if;
end $fn$;

create function public.admin_pilot_metrics(p_start date,p_end date)
returns table(igreja_id uuid, cadastrados bigint,iniciaram bigint,retornaram bigint)
language plpgsql security definer set search_path=public as $fn$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin) then raise exception 'Acesso negado.'; end if;
 if p_end < p_start or p_end-p_start>366 then raise exception 'Período inválido.'; end if;
 return query
 select i.id,count(r.user_id),count(r.user_id) filter(where a.days>=1),count(r.user_id) filter(where a.days>=2)
 from public.igrejas i
 left join public.user_roles r on r.igreja_id=i.id and r.role='membro' and not r.is_super_admin
 left join (select user_id,count(*) days from public.pilot_activity where activity_day between p_start and p_end group by user_id) a on a.user_id=r.user_id
 group by i.id;
end $fn$;

create function public.admin_assign_member(p_user_id uuid,p_igreja_id uuid)
returns void language plpgsql security definer set search_path=public as $fn$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin) then raise exception 'Acesso negado.'; end if;
 if not exists(select 1 from public.igrejas where id=p_igreja_id) then raise exception 'Igreja não encontrada.'; end if;
 if exists(select 1 from public.user_roles where user_id=p_user_id and role='pastor') then raise exception 'Este usuário é pastor. Use a vinculação de pastor.'; end if;
 update public.user_roles set igreja_id=p_igreja_id,updated_at=now() where user_id=p_user_id;
 if not found then raise exception 'Participante não encontrado.'; end if;
end $fn$;

-- Only the authenticated application APIs remain callable by signed-in users.
do $block$
declare f record;
begin
 for f in select p.oid,p.proname from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef loop
 execute format('revoke execute on function %s from public,anon,authenticated',f.oid::regprocedure);
 if f.proname like 'admin_%' or f.proname like 'get_church_%' or f.proname in ('update_my_profile_details','record_pilot_activity') then
 execute format('grant execute on function %s to authenticated',f.oid::regprocedure);
 end if;
 end loop;
end $block$;

-- Names supplied by the product owner. No pastor or participant is assigned.
insert into public.igrejas(nome)
select n from (values ('Maranata (Macapá–AP)'),('PIB Betel (Santana–AP)'),('IB Pedras Vivas (Joinville)')) v(n)
where not exists(select 1 from public.igrejas i where i.nome=v.n);

