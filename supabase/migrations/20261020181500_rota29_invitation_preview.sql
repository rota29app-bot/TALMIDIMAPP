-- ROTA29: consulta segura do nome da igreja a partir do código autenticado.
create or replace function public.rota29_invitation_details(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare invited record;
begin
 if auth.uid() is null then raise exception 'Entre com sua conta Google.';end if;
 if p_codigo is null or btrim(p_codigo) !~ '^[A-Fa-f0-9]{16}$' then
  return jsonb_build_object('valid',false);
 end if;
 select pc.igreja_id,i.nome into invited from public.pilot_church_registrations pc
 join public.igrejas i on i.id=pc.igreja_id
 join public.rota29_church_settings s on s.igreja_id=pc.igreja_id
 where pc.codigo_convite=upper(btrim(p_codigo))
 and s.approval_status='approved' and s.license_status in ('pilot','active');
 if not found then return jsonb_build_object('valid',false);end if;
 return jsonb_build_object('valid',true,'igreja_id',invited.igreja_id,'nome',invited.nome);
end $fn$;
revoke all on function public.rota29_invitation_details(text) from public,anon,authenticated;
grant execute on function public.rota29_invitation_details(text) to authenticated;