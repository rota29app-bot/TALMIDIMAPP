-- ROTA29 piloto: horário de oração individual e Memorial por dia (idempotente)
-- Banco compartilhado: preserva todas as contas e registros históricos.
-- Scripts existentes de progresso não são removidos; a API antiga de conclusão
-- perde EXECUTE quando a interface nova estiver ativa.
create table if not exists public.rota29_daily_schedule(
  user_id uuid primary key references auth.users(id) on delete cascade,
  prayer_time time without time zone not null,
  time_zone text not null,
  first_open_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rota29_daily_unlocks(
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_id text not null check(stage_id in ('house','street','office')),
  day_index integer not null check(day_index between 1 and 21),
  ready_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(user_id,stage_id)
);
create table if not exists public.rota29_day_memorials(
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_id text not null check(stage_id in ('house','street','office')),
  day_number integer not null check(day_number between 1 and 21),
  diary_id uuid not null unique references public.user_diary(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key(user_id,stage_id,day_number)
);
alter table public.rota29_daily_schedule enable row level security;
alter table public.rota29_daily_unlocks enable row level security;
alter table public.rota29_day_memorials enable row level security;
revoke all on public.rota29_daily_schedule,public.rota29_daily_unlocks,public.rota29_day_memorials
 from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rota29_complete_scheduled_day(p_stage text, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); g jsonb; state record; clock record; next_day int; opening timestamptz; idx int;
begin
 if u is null then raise exception 'Entre com Google.';end if;
 if p_stage is null or p_stage not in ('house','street','office') or p_day is null
 or p_day<1 or p_day>(case when p_stage='house' then 21 else 7 end) then
 raise exception 'Dia ou estação inválidos.';end if;
 if not exists(select 1 from public.user_roles r
 join public.rota29_member_approvals m on m.user_id=r.user_id and m.igreja_id=r.igreja_id
 where r.user_id=u and r.role='membro' and not r.is_super_admin and m.status='approved')
 then raise exception 'Aprovação pastoral obrigatória.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||':pilot',0));
 select day_index,updated_at into state from public.user_daily_progress
 where user_id=u and stage_id=p_stage for update;
 if coalesce(state.day_index,1)<>p_day then raise exception 'Atualize o progresso.';end if;
 g:=public.rota29_my_day_gate(p_stage);
 if g->>'status'<>'open' or (g->>'day_index')::int is distinct from p_day then
 raise exception 'Dia fechado até o próximo horário de oração.';end if;
 if not exists(select 1 from public.rota29_day_memorials
 where user_id=u and stage_id=p_stage and day_number=p_day) then
 raise exception 'Registre o Memorial antes de concluir.';end if;
 select prayer_time,time_zone into clock from public.rota29_daily_schedule where user_id=u;
 if not found then raise exception 'Configure seu horário de oração.';end if;
 if state.updated_at is not null and
 (state.updated_at at time zone clock.time_zone)::date >= (now() at time zone clock.time_zone)::date then
 raise exception 'Um dia de cada vez. Volte amanhã.';end if;
 next_day:=p_day+1;
 opening:=((((now() at time zone clock.time_zone)::date+1)+clock.prayer_time)
 at time zone clock.time_zone);
 insert into public.user_daily_progress(user_id,stage_id,day_index,updated_at)
 values(u,p_stage,next_day,now())
 on conflict(user_id,stage_id) do update
 set day_index=excluded.day_index,updated_at=excluded.updated_at;
 insert into public.rota29_daily_unlocks(user_id,stage_id,day_index,ready_at)
 values(u,p_stage,next_day,opening)
 on conflict(user_id,stage_id) do update
 set day_index=excluded.day_index,ready_at=excluded.ready_at;
 idx:=case when p_stage='house' then 0 when p_stage='street' then 1 else 2 end;
 if p_day=7 and idx<2 then
 insert into public.user_stage_unlocks(user_id,current_stage_index,updated_at)
 values(u,idx+1,now())
 on conflict(user_id) do update
 set current_stage_index=least(2,greatest(public.user_stage_unlocks.current_stage_index,excluded.current_stage_index)),
 updated_at=now();
 end if;
 if p_stage='house' and p_day=21 then
 insert into public.user_badges(user_id,badge_id) values(u,'house')
 on conflict(user_id,badge_id) do nothing;end if;
 return jsonb_build_object('stage',p_stage,'day_index',next_day,
 'milestone',p_day=7 and idx<2,'first_badge',p_stage='house' and p_day=21,
 'next_ready_at',opening);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_complete_verified_day(p_stage text, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); epoch_day integer:=floor(extract(epoch from now())/86400)::integer;
begin
 if u is null then raise exception 'Entre com sua conta Google.';end if;
 if not exists(select 1 from public.user_practices p
 where p.user_id=u and p.stage_id=p_stage and p.day_number=p_day
 and p.specific_practice_done=true) then
 raise exception 'Complete a prática específica deste dia.';end if;
 if not exists(select 1 from public.user_practices p
 where p.user_id=u and p.stage_id='_global' and p.day_number=epoch_day
 and p.tsd_done=true and p.intercession_done=true) then
 raise exception 'Confirme a oração e a intercessão de hoje.';end if;
 if not exists(select 1 from public.user_station_scores s
 where s.user_id=u and s.stage_id=p_stage and s.score is not null) then
 raise exception 'Registre sua avaliação da estação.';end if;
 return public.rota29_complete_scheduled_day(p_stage,p_day);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_my_day_gate(p_stage text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); sch public.rota29_daily_schedule%rowtype;
 prog record; previous record; unlock record;
 day_num int; ready timestamptz; saved boolean; previous_stage text;
begin
 if uid is null then return jsonb_build_object('status','unauthenticated','open',false);end if;
 if p_stage is null or p_stage not in ('house','street','office') then raise exception 'Estação inválida.';end if;
 if not coalesce((public.rota29_pilot_access()->>'allowed')::boolean,false) then
 return jsonb_build_object('status','not_authorized','open',false);end if;
 if exists(select 1 from public.user_roles where user_id=uid and is_super_admin) then
 return jsonb_build_object('status','admin_preview','open',true,'day_index',1);end if;
 select * into sch from public.rota29_daily_schedule where user_id=uid;
 if not found then return jsonb_build_object('status','needs_setup','open',false);end if;
 select day_index,updated_at into prog from public.user_daily_progress where user_id=uid and stage_id=p_stage;
 day_num:=coalesce(prog.day_index,1);
 if day_num>(case when p_stage='house' then 21 else 7 end) or
 (p_stage='house' and exists(select 1 from public.user_badges where user_id=uid and badge_id='house')) then
 return jsonb_build_object('status','stage_completed','open',false,'day_index',day_num);end if;
 select day_index,ready_at into unlock from public.rota29_daily_unlocks
 where user_id=uid and stage_id=p_stage;
 if found and unlock.day_index=day_num then ready:=unlock.ready_at;
 elsif day_num=1 and p_stage='house' then ready:=sch.first_open_at;
 elsif day_num=1 and p_stage<>'house' then
 previous_stage:=case when p_stage='street' then 'house' else 'street' end;
 select day_index,updated_at into previous from public.user_daily_progress
 where user_id=uid and stage_id=previous_stage;
 if coalesce(previous.day_index,0)<8 then
 return jsonb_build_object('status','previous_stage','open',false,'day_index',day_num);end if;
 ready:=((((previous.updated_at at time zone sch.time_zone)::date+1)+sch.prayer_time)
 at time zone sch.time_zone);
 else
 ready:=((((prog.updated_at at time zone sch.time_zone)::date+1)+sch.prayer_time)
 at time zone sch.time_zone);
 end if;
 select exists(select 1 from public.rota29_day_memorials where user_id=uid and stage_id=p_stage and day_number=day_num) into saved;
 return jsonb_build_object(
 'status',case when now()>=ready then 'open' else 'waiting' end,
 'open',now()>=ready,'day_index',day_num,
 'ready_at',ready,'prayer_time',to_char(sch.prayer_time,'HH24:MI'),
 'time_zone',sch.time_zone,'memorial_saved',saved);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_my_prayer_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); s record;
begin
 if u is null then raise exception 'Entre com Google.';end if;
 if not coalesce((public.rota29_pilot_access()->>'allowed')::boolean,false) then
 raise exception 'Acesso à jornada não autorizado.';end if;
 select prayer_time,time_zone,first_open_at into s
 from public.rota29_daily_schedule where user_id=u;
 if not found then return jsonb_build_object('configured',false);end if;
 return jsonb_build_object('configured',true,
 'prayer_time',to_char(s.prayer_time,'HH24:MI'),
 'time_zone',s.time_zone,'first_open_at',s.first_open_at);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_save_daily_memorial(p_stage text, p_day integer, p_vivido text, p_deus_falou text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); gate jsonb; diary_uuid uuid; previous_id uuid;
begin
 if uid is null then raise exception 'Entre com Google.';end if;
 if p_stage is null or p_stage not in ('house','street','office') or p_day is null or p_day<1
 or p_day>(case when p_stage='house' then 21 else 7 end) then
 raise exception 'Dia ou estação inválidos.';end if;
 if length(btrim(coalesce(p_vivido,'')))+length(btrim(coalesce(p_deus_falou,'')))<4 then
 raise exception 'Escreva sua reflexão antes de concluir o dia.';end if;
 if length(coalesce(p_vivido,''))>10000 or length(coalesce(p_deus_falou,''))>10000 then
 raise exception 'Memorial muito extenso.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':pilot',0));
 gate:=public.rota29_my_day_gate(p_stage);
 if gate->>'status'<>'open' or (gate->>'day_index')::int is distinct from p_day then
 raise exception 'Este dia ainda não está disponível para o Memorial.';end if;
 select diary_id into previous_id from public.rota29_day_memorials
 where user_id=uid and stage_id=p_stage and day_number=p_day for update;
 if previous_id is not null then
 update public.user_diary set vivido_hoje=coalesce(nullif(btrim(p_vivido),''),'—'),
 deus_falou=coalesce(nullif(btrim(p_deus_falou),''),'—')
 where id=previous_id and user_id=uid;
 diary_uuid:=previous_id;
 else
 insert into public.user_diary(user_id,vivido_hoje,deus_falou)
 values(uid,coalesce(nullif(btrim(p_vivido),''),'—'),coalesce(nullif(btrim(p_deus_falou),''),'—'))
 returning id into diary_uuid;
 insert into public.rota29_day_memorials(user_id,stage_id,day_number,diary_id)
 values(uid,p_stage,p_day,diary_uuid);
 end if;
 return jsonb_build_object('saved',true,'day',p_day);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_set_daily_schedule(p_prayer_time time without time zone, p_time_zone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); current_schedule public.rota29_daily_schedule%rowtype;
 first_open timestamptz;
begin
 if uid is null then raise exception 'Entre com sua conta Google.';end if;
 if p_prayer_time is null or p_time_zone is null or length(p_time_zone)>64
  or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then
  raise exception 'Horário ou fuso inválido.';end if;
 if not coalesce((public.rota29_pilot_access()->>'allowed')::boolean,false)
 or not exists(select 1 from public.user_roles r
 join public.rota29_member_approvals m on m.user_id=r.user_id and m.igreja_id=r.igreja_id
 where r.user_id=uid and r.role='membro' and not r.is_super_admin and m.status='approved') then
 raise exception 'Apenas participantes autorizados podem programar a jornada.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':pilot',0));
 select * into current_schedule from public.rota29_daily_schedule where user_id=uid for update;
 first_open:=(((now() at time zone p_time_zone)::date+p_prayer_time) at time zone p_time_zone);
 if first_open<now() then
 first_open:=((((now() at time zone p_time_zone)::date+1)+p_prayer_time) at time zone p_time_zone);
 end if;
 if found then
 update public.rota29_daily_schedule
 set prayer_time=p_prayer_time,time_zone=p_time_zone,updated_at=now() where user_id=uid;
 else
 insert into public.rota29_daily_schedule(user_id,prayer_time,time_zone,first_open_at)
 values(uid,p_prayer_time,p_time_zone,first_open);
 end if;
 return jsonb_build_object('prayer_time',to_char(p_prayer_time,'HH24:MI'),
 'time_zone',p_time_zone,'first_open_at',coalesce(current_schedule.first_open_at,first_open));
end $function$;
revoke all on function public.rota29_set_daily_schedule(time,text),
 public.rota29_my_prayer_schedule(),
 public.rota29_my_day_gate(text),
 public.rota29_save_daily_memorial(text,integer,text,text),
 public.rota29_complete_scheduled_day(text,integer),
 public.rota29_complete_verified_day(text,integer)
 from public,anon,authenticated;
grant execute on function public.rota29_set_daily_schedule(time,text),
 public.rota29_my_prayer_schedule(),
 public.rota29_my_day_gate(text),
 public.rota29_save_daily_memorial(text,integer,text,text),
 public.rota29_complete_verified_day(text,integer) to authenticated;
-- A função v2 é interna; não permitir que o cliente salte validações de práticas.
-- Desativação da função anterior, somente após implantar a interface nova:
revoke all on function public.pilot_complete_day(text,integer) from public,anon,authenticated;
