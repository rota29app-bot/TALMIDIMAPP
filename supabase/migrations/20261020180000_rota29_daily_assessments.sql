-- Avaliação diária ROTA29 - piloto institucional.
-- Isolada de user_station_scores: registros semanais/históricos ficam intactos.
-- Não executar a alteração de interface em main.
create table if not exists public.rota29_daily_assessments (
 user_id uuid not null references auth.users(id) on delete cascade,
 stage_id text not null check(stage_id in ('house','street','office')),
 day_number integer not null check(day_number between 1 and 21 and (stage_id='house' or day_number<=7)),
 score smallint not null check(score between 0 and 3),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,stage_id,day_number)
);
alter table public.rota29_daily_assessments enable row level security;
revoke all on public.rota29_daily_assessments from public,anon,authenticated;

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
 if not exists(select 1 from public.rota29_daily_assessments s
 where s.user_id=u and s.stage_id=p_stage and s.day_number=p_day and s.score between 0 and 3) then
 raise exception 'Registre sua avaliação deste dia antes de concluir.';end if;
 return public.rota29_complete_scheduled_day(p_stage,p_day);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_my_daily_assessment(p_stage text, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); g jsonb; point record;
begin
 if uid is null then raise exception 'Entre com Google.';end if;
 if p_stage is null or p_stage not in ('house','street','office') or
   p_day is null or p_day<1 or p_day>(case when p_stage='house' then 21 else 7 end)
 then raise exception 'Estação ou dia inválido.';end if;
 g:=public.rota29_my_day_gate(p_stage);
 if g->>'status' not in ('open','waiting','stage_completed','admin_preview') then
  raise exception 'A jornada precisa estar autorizada para acessar a avaliação.';end if;
 if g->>'status'<>'admin_preview' and p_day>coalesce((g->>'day_index')::integer,0) then
  raise exception 'Este dia ainda não está disponível.';end if;
 select score,updated_at into point from public.rota29_daily_assessments
 where user_id=uid and stage_id=p_stage and day_number=p_day;
 if not found then return jsonb_build_object('score',null,'day',p_day,'stage',p_stage);end if;
 return jsonb_build_object('score',point.score,'day',p_day,'stage',p_stage,'updated_at',point.updated_at);
end $function$;

CREATE OR REPLACE FUNCTION public.rota29_save_daily_assessment(p_stage text, p_day integer, p_score integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); gate jsonb;
begin
 if uid is null then raise exception 'Entre com Google.';end if;
 if p_stage is null or p_stage not in ('house','street','office') or
    p_day is null or p_day<1 or p_day>(case when p_stage='house' then 21 else 7 end)
 then raise exception 'Estação ou dia inválido.';end if;
 if p_score is null or p_score<0 or p_score>3 then
  raise exception 'A avaliação deve ser de 0 a 3.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':pilot',0));
 gate:=public.rota29_my_day_gate(p_stage);
 if not (gate->>'status'='open' and (gate->>'day_index')::integer=p_day)
   and gate->>'status'<>'admin_preview' then
   raise exception 'Somente o dia disponível pode receber uma avaliação.';end if;
 insert into public.rota29_daily_assessments(user_id,stage_id,day_number,score)
 values(uid,p_stage,p_day,p_score)
 on conflict(user_id,stage_id,day_number) do update
 set score=excluded.score,updated_at=now();
 return jsonb_build_object('saved',true,'score',p_score,'day',p_day);
end $function$;
revoke all on function public.rota29_my_daily_assessment(text,integer),
 public.rota29_save_daily_assessment(text,integer,integer) from public,anon,authenticated;
grant execute on function public.rota29_my_daily_assessment(text,integer),
 public.rota29_save_daily_assessment(text,integer,integer) to authenticated;

-- Confere que o progresso agora exige avaliação específica do dia.
do $verify$
begin
 if position('public.rota29_daily_assessments' in
   pg_get_functiondef('public.rota29_complete_verified_day(text,integer)'::regprocedure))=0
 then raise exception 'Conclusão do dia não está vinculada à avaliação diária'; end if;
end $verify$;
