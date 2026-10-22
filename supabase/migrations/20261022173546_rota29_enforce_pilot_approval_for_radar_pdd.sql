-- Espelho da migração já aplicada no Supabase ROTA29 em 22/10/2026.
-- Preserva o histórico e impede gravações de Radar/PDD sem permissão.
-- A política é restritiva e acrescenta proteção às regras existentes.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_radars'
    and policyname='rota29_mandatory_approved_radar_insert') then
    create policy rota29_mandatory_approved_radar_insert on public.user_radars
      as restrictive for insert to authenticated
      with check (user_id = (select auth.uid()) and (select rota29_private.can_write_journey()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_pdds'
    and policyname='rota29_mandatory_approved_pdd_insert') then
    create policy rota29_mandatory_approved_pdd_insert on public.user_pdds
      as restrictive for insert to authenticated
      with check (user_id = (select auth.uid()) and (select rota29_private.can_write_journey()));
  end if;
end;
$$;
