-- Teste funcional transacional da capacidade.
-- Cria participantes artificiais apenas dentro da transação e reverte tudo no fim.
begin;
create temporary table rota29_capacity_probe(kind text primary key,id uuid not null default gen_random_uuid());
insert into rota29_capacity_probe(kind) values
 ('memorial_1'),('memorial_2'),('memorial_3'),
 ('other_01'),('other_02'),('other_03'),('other_04'),('other_05'),
 ('other_06'),('other_07'),('other_08'),('other_09'),('other_10'),('other_11');
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,kind||'@rota29-test.invalid','authenticated','authenticated','{}'::jsonb,'{}'::jsonb,now(),now()
from rota29_capacity_probe;
insert into public.rota29_member_approvals(user_id,igreja_id,status,requested_at)
select id,'bb1398de-0716-4860-92c8-59c54c5e45f5','pending',now()
from rota29_capacity_probe where kind like 'memorial_%';
do $test$
declare
 pastor uuid;
 memorial uuid:='bb1398de-0716-4860-92c8-59c54c5e45f5';
 other_church uuid;
 capacity jsonb;
 blocked boolean:=false;
 member_count integer;
begin
 select responsavel_id into pastor
 from public.pilot_church_registrations where igreja_id=memorial;
 if pastor is null then raise exception 'Pastor responsável da Memorial não localizado';end if;
 if exists(
  select 1 from public.user_roles r join rota29_capacity_probe p on p.id=r.user_id
  where p.kind like 'memorial_%' and r.igreja_id is not null
 ) then raise exception 'Solicitação pendente recebeu vínculo antes da aprovação';end if;
 if (select count(*) from public.rota29_member_approvals a
     join rota29_capacity_probe p on p.id=a.user_id
     where p.kind like 'memorial_%' and a.status='pending')<>3 then
  raise exception 'As três solicitações devem aguardar aprovação individual';
 end if;
 perform set_config('request.jwt.claim.sub',pastor::text,true);
 perform public.rota29_pastor_review_member((select id from rota29_capacity_probe where kind='memorial_1'),true);
 perform public.rota29_pastor_review_member((select id from rota29_capacity_probe where kind='memorial_2'),true);
 perform public.rota29_pastor_review_member((select id from rota29_capacity_probe where kind='memorial_3'),true);
 capacity:=public.rota29_my_church_capacity();
 if capacity->>'approved_members'<>'11' or capacity->>'unlimited'<>'true' or capacity->'member_limit'<>'null'::jsonb then
  raise exception 'Capacidade da Memorial incorreta: %',capacity;
 end if;
 select i.id into other_church
 from public.igrejas i join public.rota29_church_settings s on s.igreja_id=i.id
 where i.id<>memorial and s.approval_status='approved'
 and s.license_status in ('pilot','active')
 order by i.id limit 1;
 if other_church is null then raise exception 'Não foi localizada outra igreja aprovada';end if;
 update public.user_roles
 set role='membro',is_super_admin=false,igreja_id=other_church
 where user_id in(select id from rota29_capacity_probe where kind like 'other_%' and kind<>'other_11');
 begin
  update public.user_roles
  set role='membro',is_super_admin=false,igreja_id=other_church
  where user_id=(select id from rota29_capacity_probe where kind='other_11');
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'A igreja padrão aceitou o participante 11';end if;
 select count(*) into member_count from public.user_roles
 where igreja_id=other_church and role='membro' and not is_super_admin;
 if member_count<>10 then raise exception 'Limite padrão esperado 10, recebido %',member_count;end if;
 raise notice 'PASS: Memorial aprovou individualmente o participante 11; igreja padrão bloqueou o participante 11.';
end
$test$;
rollback;
