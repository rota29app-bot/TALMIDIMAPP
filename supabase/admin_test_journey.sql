CREATE OR REPLACE FUNCTION public.rota29_admin_complete_day(p_stage text, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); stage_idx integer; allowed_max integer; prior record; other_stage record; unlocked integer; next_day integer;
today_sp date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if uid is null then raise exception 'Entre com sua conta.'; end if;
 if not exists(select 1 from public.user_roles r where r.user_id=uid and r.is_super_admin) then
   raise exception 'Somente superadministradores podem usar a jornada de teste.';
 end if;
 stage_idx:=case p_stage when 'house' then 0 when 'street' then 1 when 'office' then 2 else -1 end;
 allowed_max:=case when p_stage='house' then 21 else 7 end;
 if p_day is null or stage_idx<0 or p_day<1 or p_day>allowed_max then raise exception 'Estação ou dia fora do piloto.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || ':pilot',0));
 select day_index,updated_at into prior from public.user_daily_progress
 where user_id=uid and stage_id=p_stage for update;
 if coalesce(prior.day_index,1)<>p_day then raise exception 'O progresso mudou. Atualize sua tela.'; end if;
 if prior.updated_at is not null and (prior.updated_at at time zone 'America/Sao_Paulo')::date >= today_sp then
    raise exception 'Você já concluiu este dia. Continue amanhã.';
 end if;
 if stage_idx>0 and p_day=1 then
  select day_index,updated_at into other_stage from public.user_daily_progress
  where user_id=uid and stage_id=case stage_idx when 1 then 'house' else 'street' end;
  if coalesce(other_stage.day_index,0)<8 or
   (other_stage.updated_at at time zone 'America/Sao_Paulo')::date >= today_sp then
    raise exception 'A próxima estação começa após sete dias da anterior, no dia seguinte.';
  end if;
 end if;
 next_day:=least(21,p_day+1);
 insert into public.user_daily_progress(user_id,stage_id,day_index,updated_at)
 values(uid,p_stage,next_day,now())
 on conflict(user_id,stage_id) do update set day_index=excluded.day_index,updated_at=excluded.updated_at;
 if p_day=7 and stage_idx<2 then
   insert into public.user_stage_unlocks(user_id,current_stage_index,updated_at)
   values(uid,stage_idx+1,now())
   on conflict(user_id) do update set current_stage_index=least(2,greatest(
      public.user_stage_unlocks.current_stage_index, excluded.current_stage_index)),updated_at=now();
 end if;
 if p_stage='house' and p_day=21 then
   insert into public.user_badges(user_id,badge_id) values(uid,'house')
   on conflict(user_id,badge_id) do nothing;
 end if;
 return jsonb_build_object('stage',p_stage,'day_index',next_day,
    'milestone',p_day=7 and stage_idx<2,'first_badge',p_stage='house' and p_day=21);
end $function$
;
revoke all on function public.rota29_admin_complete_day(text,integer) from public, anon;
grant execute on function public.rota29_admin_complete_day(text,integer) to authenticated;
