create or replace function public.rota29_set_daily_schedule(p_prayer_time time without time zone, p_time_zone text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 uid uuid:=auth.uid();
 current_schedule public.rota29_daily_schedule%rowtype;
 access jsonb;
 first_open timestamptz;
begin
 if uid is null then raise exception 'Entre com sua conta Google.';end if;
 if p_prayer_time is null or p_time_zone is null or length(p_time_zone)>64
  or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then
  raise exception 'Horário ou fuso inválido.';end if;
 access:=public.rota29_pilot_access();
 if not coalesce((access->>'allowed')::boolean,false)
 or not (
  exists(select 1 from public.user_roles r
   join public.rota29_member_approvals m on m.user_id=r.user_id and m.igreja_id=r.igreja_id
   where r.user_id=uid and r.role='membro' and not r.is_super_admin and m.status='approved')
  or access->>'status'='pastor'
 ) then raise exception 'Apenas participantes autorizados ou o pastor responsável podem programar a jornada.';end if;
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

create or replace function public.rota29_complete_scheduled_day(p_stage text, p_day integer)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 u uuid:=auth.uid();
 access jsonb;
 g jsonb;
 state record;
 clock record;
 next_day int;
 opening timestamptz;
 idx int;
begin
 if u is null then raise exception 'Entre com Google.';end if;
 if p_stage is null or p_stage not in ('house','street','office') or p_day is null
 or p_day<1 or p_day>(case when p_stage='house' then 21 else 7 end) then
 raise exception 'Dia ou estação inválidos.';end if;
 access:=public.rota29_pilot_access();
 if not coalesce((access->>'allowed')::boolean,false)
 or not (
  exists(select 1 from public.user_roles r
   join public.rota29_member_approvals m on m.user_id=r.user_id and m.igreja_id=r.igreja_id
   where r.user_id=u and r.role='membro' and not r.is_super_admin and m.status='approved')
  or access->>'status'='pastor'
 ) then raise exception 'Aprovação pastoral obrigatória.';end if;
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
