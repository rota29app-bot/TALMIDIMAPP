-- ROTA29 / Pequenos Grupos: módulo opcional, isolado da jornada pessoal.
create table if not exists public.rota29_pg_groups (
 id uuid primary key default gen_random_uuid(),
 igreja_id uuid not null references public.igrejas(id),
 name text not null check (char_length(trim(name)) between 2 and 90),
 leader_id uuid references auth.users(id) on delete set null,
 created_by uuid not null references auth.users(id),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rota29_pg_groups_church on public.rota29_pg_groups(igreja_id,active);
create unique index if not exists rota29_pg_one_active_leadership
 on public.rota29_pg_groups(leader_id) where active and leader_id is not null;

create table if not exists public.rota29_pg_members (
 igreja_id uuid not null references public.igrejas(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 group_id uuid not null references public.rota29_pg_groups(id),
 assigned_by uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key (igreja_id,user_id)
);
create index if not exists rota29_pg_members_group on public.rota29_pg_members(group_id);

create table if not exists public.rota29_pg_care_notes (
 id uuid primary key default gen_random_uuid(),
 igreja_id uuid not null references public.igrejas(id),
 group_id uuid references public.rota29_pg_groups(id) on delete set null,
 participant_id uuid not null references auth.users(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 care_type text not null check(care_type in ('message','visit','discipleship','other')),
 note_text text not null check(char_length(trim(note_text)) between 2 and 2000),
 pastor_only boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists rota29_pg_notes_member on public.rota29_pg_care_notes(igreja_id,participant_id,created_at desc);
alter table public.rota29_pg_groups enable row level security;
alter table public.rota29_pg_members enable row level security;
alter table public.rota29_pg_care_notes enable row level security;
revoke all on public.rota29_pg_groups,public.rota29_pg_members,public.rota29_pg_care_notes from public,anon,authenticated;

-- Retorna apenas o contexto da igreja ativa do solicitante.
create or replace function public.rota29_pg_context()
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare uid uuid:=auth.uid(); r record; ch uuid; gid uuid;
begin
 if uid is null then return jsonb_build_object('role','none'); end if;
 select role,igreja_id,is_super_admin into r from public.user_roles where user_id=uid;
 if not found or r.igreja_id is null or coalesce(r.is_super_admin,false) then
   return jsonb_build_object('role','none'); end if;
 if not exists (
  select 1 from public.pilot_church_registrations pc
  join public.rota29_church_settings cs on cs.igreja_id=pc.igreja_id
  where pc.igreja_id=r.igreja_id and cs.approval_status='approved'
  and cs.license_status in ('pilot','active')
 ) then return jsonb_build_object('role','none'); end if;
 if r.role='pastor' and exists (
   select 1 from public.pilot_church_registrations pc
   where pc.igreja_id=r.igreja_id and pc.responsavel_id=uid
 ) then return jsonb_build_object('role','pastor','church_id',r.igreja_id); end if;
 if r.role='membro' and exists (
  select 1 from public.rota29_member_approvals a
  where a.user_id=uid and a.igreja_id=r.igreja_id and a.status='approved'
 ) then
  select g.id into gid from public.rota29_pg_groups g
   where g.igreja_id=r.igreja_id and g.leader_id=uid and g.active limit 1;
  if gid is not null then return jsonb_build_object('role','leader','church_id',r.igreja_id,'group_id',gid); end if;
 end if;
 return jsonb_build_object('role','none');
end $fn$;

-- Nunca retorna diário pessoal, orações ou observações privadas.
create or replace function public.rota29_pg_overview()
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare ctx jsonb:=public.rota29_pg_context(); ch uuid; ispastor boolean; own uuid;
 groups_json jsonb; members_json jsonb; threshold int;
begin
 if ctx->>'role' not in ('pastor','leader') then
  return jsonb_build_object('role','none','groups','[]'::jsonb,'members','[]'::jsonb); end if;
 ch:=(ctx->>'church_id')::uuid; ispastor:=ctx->>'role'='pastor';
 own:=nullif(ctx->>'group_id','')::uuid;
 select coalesce(cs.alert_after_days,14) into threshold
 from public.rota29_church_settings cs where cs.igreja_id=ch;
 threshold:=coalesce(threshold,14);
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',g.id,'name',g.name,'leader_id',g.leader_id,
   'leader_name',coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),u.email,'Sem líder'),
   'active',g.active,
   'member_count',(select count(*) from public.rota29_pg_members gm where gm.group_id=g.id)
 ) order by g.name),'[]'::jsonb) into groups_json
 from public.rota29_pg_groups g
 left join auth.users u on u.id=g.leader_id
 where g.igreja_id=ch and (ispastor or (g.id=own and g.active));

 select coalesce(jsonb_agg(jsonb_build_object(
  'user_id',a.user_id,
  'name',coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),u.email,'Participante'),
  'email',u.email,'group_id',gm.group_id,
  'house',case when exists(select 1 from public.user_badges b where b.user_id=a.user_id and b.badge_id='house') then 21 else least(21,greatest(0,coalesce(h.day_index,1)-1)) end,
  'street',least(7,greatest(0,coalesce(s.day_index,1)-1)),
  'office',least(7,greatest(0,coalesce(o.day_index,1)-1)),
  'last_progress',pr.last_progress,
  'needs_attention',coalesce(pr.last_progress,a.reviewed_at,a.requested_at) < now() - (threshold * interval '1 day')
 ) order by coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),u.email)),'[]'::jsonb)
 into members_json
 from public.rota29_member_approvals a
 join public.user_roles ur on ur.user_id=a.user_id and ur.igreja_id=ch and ur.role='membro' and not ur.is_super_admin
 join auth.users u on u.id=a.user_id
 left join public.rota29_pg_members gm on gm.user_id=a.user_id and gm.igreja_id=ch
 left join public.user_daily_progress h on h.user_id=a.user_id and h.stage_id='house'
 left join public.user_daily_progress s on s.user_id=a.user_id and s.stage_id='street'
 left join public.user_daily_progress o on o.user_id=a.user_id and o.stage_id='office'
 left join lateral(select max(updated_at) as last_progress from public.user_daily_progress d where d.user_id=a.user_id) pr on true
 where a.igreja_id=ch and a.status='approved'
 and (ispastor or gm.group_id=own);

 return jsonb_build_object('role',ctx->>'role','groups',groups_json,
  'members',members_json,'alert_after_days',threshold);
end $fn$;

-- Apenas o pastor responsável da igreja pode gerir os grupos e membros.
create or replace function public.rota29_pg_manage(
 p_action text, p_group uuid default null, p_name text default null,
 p_leader uuid default null, p_member uuid default null
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare ctx jsonb:=public.rota29_pg_context(); ch uuid; gid uuid; valid_member boolean;
begin
 if ctx->>'role'<>'pastor' then raise exception 'Somente o pastor responsável pode organizar os grupos.';end if;
 ch:=(ctx->>'church_id')::uuid;
 if p_action not in ('create','rename','leader','assign','unassign','archive','reopen') or p_action is null
 then raise exception 'Operação inválida.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ch::text||':pgm',0));
 if p_action='create' then
  if p_name is null or char_length(trim(p_name)) not between 2 and 90 then raise exception 'Informe nome de 2 a 90 caracteres.';end if;
  insert into public.rota29_pg_groups(igreja_id,name,created_by)
    values(ch,trim(p_name),auth.uid()) returning id into gid;
  return jsonb_build_object('ok',true,'group_id',gid);
 end if;
 select id into gid from public.rota29_pg_groups where id=p_group and igreja_id=ch for update;
 if gid is null then raise exception 'Grupo não encontrado nesta igreja.';end if;
 if p_action='rename' then
   if p_name is null or char_length(trim(p_name)) not between 2 and 90 then raise exception 'Nome inválido.';end if;
   update public.rota29_pg_groups set name=trim(p_name),updated_at=now() where id=gid;
 elsif p_action='leader' then
   if p_leader is not null then
    select exists(
      select 1 from public.rota29_member_approvals a
      join public.user_roles ur on ur.user_id=a.user_id and ur.igreja_id=ch and ur.role='membro' and not ur.is_super_admin
      where a.user_id=p_leader and a.igreja_id=ch and a.status='approved'
    ) into valid_member;
    if not valid_member then raise exception 'O líder deve ser participante aprovado desta igreja.';end if;
    if exists(select 1 from public.rota29_pg_groups where leader_id=p_leader and active and id<>gid)
      then raise exception 'Esta pessoa já lidera outro PG.';end if;
    if not (select active from public.rota29_pg_groups where id=gid) then raise exception 'Reative o grupo antes de definir líder.';end if;
   end if;
   update public.rota29_pg_groups set leader_id=p_leader,updated_at=now() where id=gid;
   if p_leader is not null then
    insert into public.rota29_pg_members(igreja_id,user_id,group_id,assigned_by)
    values(ch,p_leader,gid,auth.uid())
    on conflict(igreja_id,user_id) do update
       set group_id=excluded.group_id,assigned_by=excluded.assigned_by,assigned_at=now();
   end if;
 elsif p_action='assign' then
    if not (select active from public.rota29_pg_groups where id=gid) then raise exception 'Grupo arquivado.';end if;
    select exists(
      select 1 from public.rota29_member_approvals a
      join public.user_roles ur on ur.user_id=a.user_id and ur.igreja_id=ch and ur.role='membro' and not ur.is_super_admin
      where a.user_id=p_member and a.igreja_id=ch and a.status='approved'
    ) into valid_member;
    if not valid_member then raise exception 'Participante não está aprovado nesta igreja.';end if;
    if exists(select 1 from public.rota29_pg_groups where leader_id=p_member and active and id<>gid)
      then raise exception 'Não é possível mover o líder de outro grupo.';end if;
    insert into public.rota29_pg_members(igreja_id,user_id,group_id,assigned_by)
    values(ch,p_member,gid,auth.uid())
    on conflict(igreja_id,user_id) do update
       set group_id=excluded.group_id,assigned_by=excluded.assigned_by,assigned_at=now();
 elsif p_action='unassign' then
    if exists(select 1 from public.rota29_pg_groups where id=gid and leader_id=p_member)
      then raise exception 'Troque o líder antes de remover este participante.';end if;
    delete from public.rota29_pg_members where igreja_id=ch and user_id=p_member and group_id=gid;
 elsif p_action='archive' then
    update public.rota29_pg_groups set active=false,leader_id=null,updated_at=now() where id=gid;
    delete from public.rota29_pg_members where group_id=gid and igreja_id=ch;
 elsif p_action='reopen' then
    update public.rota29_pg_groups set active=true,updated_at=now() where id=gid;
 end if;
 return jsonb_build_object('ok',true,'group_id',gid);
end $fn$;

-- Histórico pastoral: pastor vê igreja inteira; líder somente notas do grupo
-- atual, exceto registros marcados como reservados ao pastor.
create or replace function public.rota29_pg_notes(p_member uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare ctx jsonb:=public.rota29_pg_context(); ch uuid; gid uuid; pastor boolean; records jsonb;
begin
 if ctx->>'role' not in ('pastor','leader') then raise exception 'Acesso negado ao histórico pastoral.';end if;
 ch:=(ctx->>'church_id')::uuid; pastor:=ctx->>'role'='pastor';
 select group_id into gid from public.rota29_pg_members where igreja_id=ch and user_id=p_member;
 if not exists (select 1 from public.rota29_member_approvals a
   join public.user_roles ur on ur.user_id=a.user_id and ur.igreja_id=ch and ur.role='membro' and not ur.is_super_admin
   where a.user_id=p_member and a.igreja_id=ch and a.status='approved')
   or (not pastor and gid is distinct from (ctx->>'group_id')::uuid)
 then raise exception 'Participante fora da sua área de acompanhamento.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'type',n.care_type,
  'text',n.note_text,'created_at',n.created_at,'pastor_only',n.pastor_only,
  'author',coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),u.email,'Liderança'))
 order by n.created_at desc),'[]'::jsonb) into records
 from (select * from public.rota29_pg_care_notes n where n.igreja_id=ch and n.participant_id=p_member
  and (pastor or (n.group_id=gid and not n.pastor_only)) order by created_at desc limit 100) n
 left join auth.users u on u.id=n.author_id;
 return records;
end $fn$;

create or replace function public.rota29_pg_add_note(
 p_member uuid,p_type text,p_text text,p_pastor_only boolean default false
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare ctx jsonb:=public.rota29_pg_context(); ch uuid; gid uuid; pastor boolean; nid uuid;
begin
 if ctx->>'role' not in ('pastor','leader') then raise exception 'Acesso negado ao acompanhamento.';end if;
 ch:=(ctx->>'church_id')::uuid; pastor:=ctx->>'role'='pastor';
 if p_type is null or p_type not in ('message','visit','discipleship','other') then raise exception 'Tipo de registro inválido.';end if;
 if p_text is null or char_length(trim(p_text)) not between 2 and 2000 then raise exception 'Informe uma anotação de 2 a 2000 caracteres.';end if;
 if p_pastor_only and not pastor then raise exception 'Somente pastores podem criar registros reservados.';end if;
 select group_id into gid from public.rota29_pg_members where igreja_id=ch and user_id=p_member;
 if not exists (select 1 from public.rota29_member_approvals a
   join public.user_roles ur on ur.user_id=a.user_id and ur.igreja_id=ch and ur.role='membro' and not ur.is_super_admin
   where a.user_id=p_member and a.igreja_id=ch and a.status='approved')
   or (not pastor and gid is distinct from (ctx->>'group_id')::uuid)
 then raise exception 'Participante fora da sua área de acompanhamento.';end if;
 insert into public.rota29_pg_care_notes(igreja_id,group_id,participant_id,author_id,care_type,note_text,pastor_only)
 values(ch,gid,p_member,auth.uid(),p_type,trim(p_text),coalesce(p_pastor_only,false)) returning id into nid;
 return jsonb_build_object('ok',true,'id',nid);
end $fn$;
revoke all on function public.rota29_pg_context(),
 public.rota29_pg_overview(),
 public.rota29_pg_manage(text,uuid,text,uuid,uuid),
 public.rota29_pg_notes(uuid),
 public.rota29_pg_add_note(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.rota29_pg_context(),
 public.rota29_pg_overview(),
 public.rota29_pg_manage(text,uuid,text,uuid,uuid),
 public.rota29_pg_notes(uuid),
 public.rota29_pg_add_note(uuid,text,text,boolean) to authenticated;
