-- ROTA29: retorno voluntário de conta pastoral criada por engano a convite de outra igreja.
create or replace function public.rota29_recover_accidental_church_invitation(
 p_codigo text,p_confirm boolean
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare
 uid uuid:=auth.uid();
 current_role record;
 own_church record;
 destination record;
 dependent_count int;
 invitation jsonb;
begin
 if uid is null then raise exception 'Entre com Google.';end if;
 if p_confirm is distinct from true then raise exception 'A correção exige confirmação expressa.';end if;
 if p_codigo is null or btrim(p_codigo) !~ '^[A-Fa-f0-9]{16}$' then raise exception 'Código inválido.';end if;
 if (select lockdown_enabled from public.rota29_pilot_policy where id=true) then raise exception 'Piloto suspenso.';end if;
 select pc.igreja_id into destination from public.pilot_church_registrations pc
 join public.rota29_church_settings cs on cs.igreja_id=pc.igreja_id
 where pc.codigo_convite=upper(btrim(p_codigo))
 and cs.approval_status='approved' and cs.license_status in ('pilot','active');
 if not found then raise exception 'Convite não disponível.';end if;
 select role,igreja_id,is_super_admin into current_role from public.user_roles
 where user_id=uid for update;
 if not found or current_role.role<>'pastor' or current_role.is_super_admin
 or current_role.igreja_id is null or current_role.igreja_id=destination.igreja_id
 then raise exception 'Vínculo institucional não elegível para correção automática.';end if;
 select igreja_id,cadastrado_em into own_church from public.pilot_church_registrations
 where responsavel_id=uid and igreja_id=current_role.igreja_id for update;
 if not found or own_church.cadastrado_em<now()-interval '48 hours'
 then raise exception 'Apenas cadastros das últimas 48 horas podem ser corrigidos automaticamente.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(own_church.igreja_id::text,0));
 select count(*) into dependent_count from public.user_roles ur
 where ur.igreja_id=own_church.igreja_id and ur.user_id<>uid;
 if dependent_count>0 or
 exists(select 1 from public.rota29_member_approvals a where a.igreja_id=own_church.igreja_id) or
 exists(select 1 from public.rota29_pg_groups g where g.igreja_id=own_church.igreja_id)
 then raise exception 'Cadastro com participantes ou grupos exige correção pela coordenação.';end if;
 update public.rota29_church_settings set approval_status='suspended',updated_at=now()
 where igreja_id=own_church.igreja_id;
 if not found then raise exception 'Configuração da igreja ausente.';end if;
 update public.user_roles set role='membro',igreja_id=null,updated_at=now()
 where user_id=uid and role='pastor' and igreja_id=own_church.igreja_id;
 if not found then raise exception 'Conta mudou; tente novamente.';end if;
 invitation:=public.pilot_join_church(upper(btrim(p_codigo)));
 return jsonb_build_object('status',invitation->>'status','nome',invitation->>'nome','recovered',true);
end $fn$;
revoke all on function public.rota29_recover_accidental_church_invitation(text,boolean) from public,anon,authenticated;
grant execute on function public.rota29_recover_accidental_church_invitation(text,boolean) to authenticated;