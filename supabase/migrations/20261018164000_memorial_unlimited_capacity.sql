-- ROTA29 / piloto: excecao de participantes ilimitados para a Memorial.
-- Modifica somente a igreja oficial identificada por nome + instante de criacao.
-- Mantem a exigencia de aprovacao pastoral e o limite de 10 para as demais.
-- Nao modifica main, contas historicas, licencas nem aprovacao institucional.
create table if not exists public.rota29_unlimited_church_members(
 igreja_id uuid primary key references public.igrejas(id) on delete cascade,
 reason text not null default 'Excecao institucional autorizada',
 configured_at timestamptz not null default now()
);
alter table public.rota29_unlimited_church_members enable row level security;
revoke all on public.rota29_unlimited_church_members from public,anon,authenticated;

do $verify$
begin
 if (select count(*) from public.igrejas
  where nome='Igreja Batista Memorial de Macapa'
   and criado_em=timestamptz '2026-10-18 15:31:08.000063+00')<>1 then
  raise exception 'Memorial oficial ambigua ou ausente: configuracao interrompida';
 end if;
end $verify$;
insert into public.rota29_unlimited_church_members(igreja_id,reason)
select id,'Participantes ilimitados para a Igreja Batista Memorial de Macapa, autorizados pela coordenacao'
from public.igrejas where nome='Igreja Batista Memorial de Macapa'
and criado_em=timestamptz '2026-10-18 15:31:08.000063+00'
on conflict(igreja_id) do nothing;

-- Primeira barreira: aprovacao pastoral (nao toca nas regras de titularidade).
do $patch$
declare ddl text;
old_guard text:='if admitted>=limit_n then raise exception ''Dez vagas ocupadas.'';end if;';
new_guard text:='if admitted>=limit_n and not exists(select 1 from public.rota29_unlimited_church_members x where x.igreja_id=church) then raise exception ''Limite de participantes da igreja atingido.'';end if;';
begin
 select pg_get_functiondef('public.rota29_pastor_review_member(uuid,boolean)'::regprocedure) into ddl;
 if position(new_guard in ddl)=0 then
  if position(old_guard in ddl)=0 then raise exception 'Guard de vagas mudou';end if;
  execute replace(ddl,old_guard,new_guard);
 end if;
end $patch$;

-- Segunda barreira: trigger de integridade sobre user_roles.
do $patch$
declare ddl text;
old_guard text:='if occupied>=s.member_limit then raise exception ''As 10 vagas desta igreja já foram preenchidas.'';end if;';
new_guard text:='if occupied>=s.member_limit and not exists(select 1 from public.rota29_unlimited_church_members unlimited where unlimited.igreja_id=new.igreja_id) then raise exception ''As vagas desta igreja já foram preenchidas.'';end if;';
begin
 select pg_get_functiondef('rota29_private.enforce_pilot_seats()'::regprocedure) into ddl;
 if position(new_guard in ddl)=0 then
  if position(old_guard in ddl)=0 then raise exception 'Guard do trigger de vagas mudou';end if;
  execute replace(ddl,old_guard,new_guard);
 end if;
end $patch$;

-- O painel administrativo representa "ilimitado" como NULL no campo de limite,
-- sem alterar a coluna member_limit=10 das outras igrejas.
do $patch$
declare ddl text;
old_field text:='),s.member_limit';
new_field text:='),case when exists(select 1 from public.rota29_unlimited_church_members unlimited where unlimited.igreja_id=pc.igreja_id) then null::integer else s.member_limit end';
begin
 select pg_get_functiondef('public.rota29_admin_pilot_churches()'::regprocedure) into ddl;
 if position(new_field in ddl)=0 then
  if position(old_field in ddl)=0 then raise exception 'Formato de lista de igrejas mudou';end if;
  execute replace(ddl,old_field,new_field);
 end if;
end $patch$;
