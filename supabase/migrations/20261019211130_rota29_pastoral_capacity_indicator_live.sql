-- ROTA29: capacidade exibida ao pastor responsável, com a exceção institucional
-- já aplicada apenas para a Igreja Batista Memorial de Macapá.
-- Esta migração registra no repositório a mesma definição já presente na base.
create or replace function public.rota29_my_church_capacity()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
 uid uuid:=auth.uid();
 ch uuid;
 settings record;
 occupied bigint;
 unlimited boolean;
begin
 if uid is null then raise exception 'Entre com Google.'; end if;
 select r.igreja_id into ch
 from public.user_roles r
 where r.user_id=uid and r.role='pastor' and not r.is_super_admin and r.igreja_id is not null;
 if ch is null then raise exception 'Apenas o pastor responsável pode consultar esta capacidade.'; end if;
 select s.member_limit,s.approval_status,s.license_status into settings
 from public.rota29_church_settings s
 join public.pilot_church_registrations pc on pc.igreja_id=s.igreja_id and pc.responsavel_id=uid
 where s.igreja_id=ch;
 if not found or settings.approval_status<>'approved' or settings.license_status not in ('pilot','active') then
  raise exception 'Instituição ainda não está autorizada.';
 end if;
 select exists(select 1 from public.rota29_unlimited_church_members x where x.igreja_id=ch)
 into unlimited;
 select count(*) into occupied
 from public.rota29_member_approvals a
 where a.igreja_id=ch and a.status='approved'
 and exists(select 1 from public.user_roles r where r.user_id=a.user_id and r.igreja_id=ch and r.role='membro' and not r.is_super_admin);
 return jsonb_build_object(
  'approved_members',occupied,
  'unlimited',unlimited,
  'member_limit',case when unlimited then null else settings.member_limit end
 );
end
$function$;
revoke all on function public.rota29_my_church_capacity() from public,anon;
grant execute on function public.rota29_my_church_capacity() to authenticated;
