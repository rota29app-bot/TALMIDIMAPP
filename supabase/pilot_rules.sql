-- Regras exclusivas do piloto. Históricos e contas antigas são preservados.
-- A inscrição também respeita o encerramento do período.
create table public.rota29_pilot_policy (
 id boolean primary key default true check(id),
 starts_on date not null default '2026-10-15',
 ends_on date not null default '2026-11-13',
 check(ends_on>=starts_on)
);
alter table public.rota29_pilot_policy enable row level security;
revoke all on public.rota29_pilot_policy from anon,authenticated;
insert into public.rota29_pilot_policy(id) values(true);
alter table public.rota29_church_settings
 add column approval_status text not null default 'pending' check(approval_status in ('pending','approved','suspended')),
 add column member_limit integer not null default 10 check(member_limit=10),
 add column approved_by uuid references auth.users(id),
 add column approved_at timestamptz;

create function public.rota29_pilot_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r record; settings record; policy record;
 status text; today_sp date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if uid is null then return jsonb_build_object('allowed',false,'status','unauthenticated');end if;
 select role,is_super_admin,igreja_id into r from public.user_roles where user_id=uid;
 if not found then return jsonb_build_object('allowed',false,'status','unselected');end if;
 if r.is_super_admin then return jsonb_build_object('allowed',true,'status','admin');end if;
 select * into policy from public.rota29_pilot_policy where id;
 if r.igreja_id is not null then
  if not exists(select 1 from public.pilot_church_registrations where igreja_id=r.igreja_id) then
   return jsonb_build_object('allowed',false,'status','archived');
  end if;
  select * into settings from public.rota29_church_settings where igreja_id=r.igreja_id;
  if not found or settings.approval_status<>'approved' then
   return jsonb_build_object('allowed',false,'status',coalesce(settings.approval_status,'pending'),
     'member_limit',10,'starts_on',policy.starts_on,'ends_on',policy.ends_on);
  end if;
 elsif not exists(select 1 from public.rota29_basic_users where user_id=uid) then
  return jsonb_build_object('allowed',false,'status','unselected');
 end if;
 if r.role='pastor' then status:='pastor';
 elsif exists(select 1 from public.user_badges where user_id=uid and badge_id='house') then status:='completed';
 elsif today_sp<policy.starts_on then status:='scheduled';
 elsif today_sp>policy.ends_on then status:='expired';
 else status:='active';end if;
 return jsonb_build_object('allowed',status in ('active','pastor'),'status',status,
   'member_limit',10,'starts_on',policy.starts_on,'ends_on',policy.ends_on);
end $$;
-- A conclusão e os convites aplicam as regras no servidor.
CREATE OR REPLACE FUNCTION public.pilot_complete_day(p_stage text, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); stage_idx integer; allowed_max integer; prior record; other_stage record; unlocked integer; next_day integer;
today_sp date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if uid is null then raise exception 'Entre com sua conta.'; end if;
 if not coalesce((public.rota29_pilot_access()->>'allowed')::boolean,false) then
 raise exception 'Sua jornada está indisponível: %.',public.rota29_pilot_access()->>'status';end if;
 if not exists(select 1 from public.user_roles r where r.user_id=uid and r.role='membro' and not r.is_super_admin and (r.igreja_id is not null or exists(select 1 from public.rota29_basic_users b where b.user_id=r.user_id))) then
   raise exception 'Entre como participante de igreja ou escolha o plano Básico.';
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
CREATE OR REPLACE FUNCTION public.pilot_join_church(p_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); my_role record; church record;
begin
 if uid is null then raise exception 'Entre com sua conta.'; end if;
 if (now() at time zone 'America/Sao_Paulo')::date > (select ends_on from public.rota29_pilot_policy where id) then
 raise exception 'O período do piloto foi encerrado.';end if;
 if p_codigo is null or length(btrim(p_codigo))<>16 then raise exception 'Código de convite inválido.'; end if;
 select role,igreja_id,is_super_admin into my_role from public.user_roles where user_id=uid for update;
 if not found then raise exception 'Conta sem perfil. Entre novamente.'; end if;
 if my_role.igreja_id is not null or my_role.is_super_admin or my_role.role <> 'membro' then
   raise exception 'Esta conta já está vinculada a uma igreja ou possui administração.';
 end if;
 select pc.igreja_id,i.nome into church
 from public.pilot_church_registrations pc join public.igrejas i on i.id=pc.igreja_id
 where pc.codigo_convite=upper(btrim(p_codigo));
 if not found then raise exception 'Convite não encontrado. Confira com seu pastor.'; end if;
 update public.user_roles set igreja_id=church.igreja_id,updated_at=now() where user_id=uid;
 return jsonb_build_object('igreja_id',church.igreja_id,'nome',church.nome,'role','membro');
end $function$
;
revoke all on function public.rota29_pilot_access() from public,anon;
grant execute on function public.rota29_pilot_access() to authenticated;

create function public.rota29_admin_pilot_churches()
returns table(igreja_id uuid,nome text,pastor_nome text,contato text,approval_status text,members bigint,member_limit integer)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin) then raise exception 'Acesso negado.';end if;
 return query select pc.igreja_id,i.nome::text,pc.pastor_nome::text,pc.contato::text,s.approval_status,
  (select count(*) from public.user_roles r where r.igreja_id=pc.igreja_id and r.role='membro' and not r.is_super_admin),s.member_limit
 from public.pilot_church_registrations pc join public.igrejas i on i.id=pc.igreja_id
 join public.rota29_church_settings s on s.igreja_id=pc.igreja_id order by i.nome,pc.igreja_id;
end $$;
revoke all on function public.rota29_admin_pilot_churches() from public,anon;
grant execute on function public.rota29_admin_pilot_churches() to authenticated;

create function public.rota29_admin_approve_church(p_igreja uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and is_super_admin) then raise exception 'Acesso negado.';end if;
 if p_approve is null then raise exception 'Informe a aprovação.';end if;
 update public.rota29_church_settings set approval_status=case when p_approve then 'approved' else 'suspended' end,
  approved_by=auth.uid(),approved_at=now(),updated_at=now()
 where igreja_id=p_igreja and exists(select 1 from public.pilot_church_registrations where igreja_id=p_igreja);
 if not found then raise exception 'Igreja do piloto não encontrada.';end if;
end $$;
revoke all on function public.rota29_admin_approve_church(uuid,boolean) from public,anon;
grant execute on function public.rota29_admin_approve_church(uuid,boolean) to authenticated;

-- O bloqueio de capacidade é transacional: a 11ª vinculação é recusada,
-- inclusive se feita por uma função administrativa, sem afetar igrejas antigas.
create function rota29_private.enforce_pilot_seats() returns trigger
language plpgsql security definer set search_path='' as $$
declare s record; occupied bigint;
begin
 if new.igreja_id is null or new.role<>'membro' or new.is_super_admin then return new;end if;
 if tg_op='UPDATE' then
  if old.igreja_id is not distinct from new.igreja_id and old.role=new.role and old.is_super_admin=new.is_super_admin then return new;end if;
 end if;
 select * into s from public.rota29_church_settings where igreja_id=new.igreja_id for update;
 if not found then return new;end if;
 if s.approval_status<>'approved' then raise exception 'A igreja aguarda liberação da coordenação.';end if;
 select count(*) into occupied from public.user_roles where igreja_id=new.igreja_id
  and role='membro' and not is_super_admin and user_id<>new.user_id;
 if occupied>=s.member_limit then raise exception 'As 10 vagas desta igreja já foram preenchidas.';end if;
 return new;
end $$;
revoke all on function rota29_private.enforce_pilot_seats() from public,anon,authenticated;
create trigger rota29_pilot_member_limit before insert or update of igreja_id,role,is_super_admin
on public.user_roles for each row execute function rota29_private.enforce_pilot_seats();

-- Restringe dados pessoais dos NOVOS participantes após o prazo/insígnia.
-- Contas anteriores permanecem intactas no aplicativo antigo.
create function rota29_private.pilot_data_allowed() returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles r where r.user_id=auth.uid() and
  (exists(select 1 from public.pilot_church_registrations pc where pc.igreja_id=r.igreja_id)
   or exists(select 1 from public.rota29_basic_users b where b.user_id=r.user_id))) then return true;end if;
 return coalesce((public.rota29_pilot_access()->>'allowed')::boolean,false);
end $$;
revoke all on function rota29_private.pilot_data_allowed() from public,anon;
grant usage on schema rota29_private to authenticated;
grant execute on function rota29_private.pilot_data_allowed() to authenticated;
do $$ declare t text;begin
 foreach t in array array['user_radars','user_pdds','user_practices','user_diary','user_station_scores','user_daily_progress','user_stage_unlocks','user_letters','user_books'] loop
  execute format('create policy rota29_pilot_window on public.%I as restrictive for all to authenticated using ((select rota29_private.pilot_data_allowed())) with check ((select rota29_private.pilot_data_allowed()))',t);
 end loop;
end $$;
CREATE OR REPLACE FUNCTION public.pilot_register_church(p_nome text, p_cidade text, p_estado text, p_pastor text, p_contato text, p_convidados integer, p_aceite boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); my_role record; church_id uuid; invite text;
begin
 if uid is null then raise exception 'Entre com sua conta antes de cadastrar.'; end if;
 if (now() at time zone 'America/Sao_Paulo')::date > (select ends_on from public.rota29_pilot_policy where id) then raise exception 'O período do piloto foi encerrado.';end if;
 if p_aceite is distinct from true then raise exception 'Confirme a política de tratamento dos dados para continuar.'; end if;
 if nullif(btrim(p_nome),'') is null or length(btrim(p_nome))<4 or length(p_nome)>130 then raise exception 'Informe o nome completo da igreja.'; end if;
 if nullif(btrim(p_cidade),'') is null or length(p_cidade)>90 then raise exception 'Informe a cidade.'; end if;
 if p_estado is null or btrim(p_estado) !~ '^[A-Za-z]{2}$' then raise exception 'Informe uma UF de dois caracteres.'; end if;
 if nullif(btrim(p_pastor),'') is null or length(p_pastor)>130 then raise exception 'Informe o nome do pastor responsável.'; end if;
 if nullif(btrim(p_contato),'') is null or length(p_contato)>150 then raise exception 'Informe um contato da igreja.'; end if;
 if p_convidados is null or p_convidados<0 or p_convidados>100000 then raise exception 'Informe o número previsto de convidados.'; end if;
 select role,igreja_id,is_super_admin into my_role from public.user_roles where user_id=uid for update;
 if not found then raise exception 'Perfil não localizado. Saia e entre novamente.'; end if;
 if my_role.igreja_id is not null or my_role.is_super_admin or my_role.role <> 'membro' then
   raise exception 'Esta conta já possui vínculo ou função administrativa. Consulte a coordenação.';
 end if;
 insert into public.igrejas(nome) values(btrim(p_nome)) returning id into church_id;
 insert into public.pilot_church_registrations(
   igreja_id,responsavel_id,pastor_nome,cidade,estado,contato,convidados_previstos
 ) values(church_id,uid,btrim(p_pastor),btrim(p_cidade),upper(btrim(p_estado)),btrim(p_contato),p_convidados)
 returning codigo_convite into invite;
 update public.user_roles set role='pastor',igreja_id=church_id,updated_at=now() where user_id=uid;
 return jsonb_build_object('igreja_id',church_id,'nome',btrim(p_nome),'codigo_convite',invite,'role','pastor');
end $function$
;
