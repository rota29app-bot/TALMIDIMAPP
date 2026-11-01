-- ROTA29: Radar coletivo do PG e da igreja.
-- Somente médias dos últimos Radares, nunca pontuações individuais.
-- Para reduzir identificação indireta, valores ocultos quando houver menos de 3 respostas.
create or replace function public.rota29_pg_collective_radar(p_group uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
 ctx jsonb := public.rota29_pg_context();
 church_id uuid;
 group_id uuid;
 pastor boolean;
 scope_name text;
 total_members integer := 0;
 answered_members integer := 0;
 stats record;
begin
 if ctx->>'role' not in ('pastor','leader') then
  raise exception 'Acesso restrito à liderança pastoral ou ao líder de PG.';
 end if;
 church_id := (ctx->>'church_id')::uuid;
 pastor := ctx->>'role' = 'pastor';

 if pastor then
  group_id := p_group;
 else
  group_id := nullif(ctx->>'group_id','')::uuid;
  if group_id is null or (p_group is not null and p_group <> group_id) then
   raise exception 'O líder só pode consultar o Radar de seu próprio PG.';
  end if;
 end if;

 if group_id is not null then
  select g.name into scope_name
  from public.rota29_pg_groups g
  where g.id=group_id and g.igreja_id=church_id and g.active;
  if scope_name is null then
   raise exception 'PG inválido ou fora da sua igreja.';
  end if;
 else
  select i.nome into scope_name from public.igrejas i where i.id=church_id;
 end if;

 with eligible as (
  select a.user_id
  from public.rota29_member_approvals a
  join public.user_roles ur on ur.user_id=a.user_id
    and ur.igreja_id=church_id and ur.role='membro'
    and not ur.is_super_admin
  where a.igreja_id=church_id and a.status='approved'
    and (group_id is null or exists (
      select 1 from public.rota29_pg_members m
      where m.igreja_id=church_id and m.user_id=a.user_id
      and m.group_id=group_id
    ))
 ), latest as (
  select r.id,r.score_intimidade,r.score_familia,r.score_evangelizacao,
    r.score_compaixao,r.score_mordomia,r.score_servico,r.score_comunhao
  from eligible e
  left join lateral (
    select ur.id,ur.score_intimidade,ur.score_familia,ur.score_evangelizacao,
      ur.score_compaixao,ur.score_mordomia,ur.score_servico,ur.score_comunhao
    from public.user_radars ur
    where ur.user_id=e.user_id
    order by ur.created_at desc,ur.id desc
    limit 1
  ) r on true
 )
 select count(*)::integer total, count(id)::integer answered,
  round(avg(score_intimidade)::numeric,2) intimidade,
  round(avg(score_familia)::numeric,2) familia,
  round(avg(score_evangelizacao)::numeric,2) evangelizacao,
  round(avg(score_compaixao)::numeric,2) compaixao,
  round(avg(score_mordomia)::numeric,2) mordomia,
  round(avg(score_servico)::numeric,2) servico,
  round(avg(score_comunhao)::numeric,2) comunhao
 into stats
 from latest;

 total_members := coalesce(stats.total,0);
 answered_members := coalesce(stats.answered,0);

 return jsonb_build_object(
  'scope',case when group_id is null then 'church' else 'group' end,
  'scope_name',scope_name,
  'total_members',total_members,
  'answered_members',answered_members,
  'minimum_required',3,
  'available',answered_members>=3,
  'max_area_score',15,
  'averages',case when answered_members>=3 then jsonb_build_object(
     'intimidade',stats.intimidade,
     'familia',stats.familia,
     'evangelizacao',stats.evangelizacao,
     'compaixao',stats.compaixao,
     'mordomia',stats.mordomia,
     'servico',stats.servico,
     'comunhao',stats.comunhao
   ) else null end
 );
end
$function$;

revoke all on function public.rota29_pg_collective_radar(uuid)
 from public, anon, authenticated;
grant execute on function public.rota29_pg_collective_radar(uuid)
 to authenticated;
