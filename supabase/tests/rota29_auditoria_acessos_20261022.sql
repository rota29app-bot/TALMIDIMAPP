-- Auditoria de leitura: nenhuma alteração de dados.
-- Resultado esperado: zero divergências em aprovações, vinculação e permissões.
select 'aprovados_sem_igreja' as verificacao,count(*) as total
from public.rota29_member_approvals a
where a.status='approved' and not exists(
 select 1 from public.user_roles r where r.user_id=a.user_id and r.igreja_id=a.igreja_id
)
union all
select 'pastores_sem_igreja',count(*)
from public.pilot_church_registrations p where not exists(
 select 1 from public.user_roles r where r.user_id=p.responsavel_id and r.igreja_id=p.igreja_id and r.role='pastor'
)
union all
select 'radar_sem_politica_de_aprovacao',case when exists(
 select 1 from pg_policies where schemaname='public' and tablename='user_radars'
 and policyname='rota29_mandatory_approved_radar_insert' and permissive='RESTRICTIVE'
) then 0 else 1 end
union all
select 'pdd_sem_politica_de_aprovacao',case when exists(
 select 1 from pg_policies where schemaname='public' and tablename='user_pdds'
 and policyname='rota29_mandatory_approved_pdd_insert' and permissive='RESTRICTIVE'
) then 0 else 1 end;
