-- Run in a transaction. Every synthetic fixture is rolled back.
begin;

create temporary table test_context(key text primary key,id uuid default gen_random_uuid());
insert into test_context(key) values('church_a'),('church_b'),('pastor_a'),('pastor_b'),('pastor_none'),('member_a'),('member_b');
grant select on test_context to authenticated;
insert into public.igrejas(id,nome) select id,'TESTE AUTOMÁTICO '||key from test_context where key like 'church_%';
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,key||'@example.invalid','authenticated','authenticated','{}','{}',now(),now() from test_context where key not like 'church_%';
insert into public.pilot_church_registrations(igreja_id,responsavel_id,pastor_nome,cidade,estado,contato,convidados_previstos)
select c.id,p.id,'Pastor de teste', 'Cidade de teste','AP','teste@example.invalid',10
from test_context c join test_context p
on p.key=case c.key when 'church_a' then 'pastor_a' else 'pastor_b' end
where c.key in ('church_a','church_b');
update public.user_roles set role='pastor',igreja_id=(select id from test_context where key='church_a') where user_id=(select id from test_context where key='pastor_a');
update public.user_roles set role='pastor',igreja_id=(select id from test_context where key='church_b') where user_id=(select id from test_context where key='pastor_b');
update public.user_roles set role='pastor',igreja_id=null where user_id=(select id from test_context where key='pastor_none');
update public.user_roles set igreja_id=(select id from test_context where key='church_a') where user_id=(select id from test_context where key='member_a');
update public.user_roles set igreja_id=(select id from test_context where key='church_b') where user_id=(select id from test_context where key='member_b');
create temporary table test_results(name text, passed boolean);
grant insert,select on test_results to authenticated;
set local role authenticated;
do $test$
declare a uuid; b uuid; c uuid; n bigint; blocked boolean;
begin
 select id into a from test_context where key='member_a';
 select id into b from test_context where key='member_b';
 select id into c from test_context where key='church_a';
 perform set_config('request.jwt.claim.sub',a::text,true);
 select count(*) into n from public.user_roles;
 if n<>1 then raise exception 'Member can read other roles'; end if;
 update public.user_roles set is_super_admin=true where user_id=a;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Self elevation'; end if;
 blocked=false;
 begin perform public.admin_get_all_members(); exception when others then blocked=true; end;
 if not blocked then raise exception 'Member accessed admin'; end if;
 blocked=false;
 begin perform public.get_church_members(); exception when others then blocked=true; end;
 if not blocked then raise exception 'Member accessed pastor'; end if;
 blocked=false;
 begin insert into public.pilot_records(igreja_id,kind,payload) values(c,'igreja','{}'); exception when insufficient_privilege then blocked=true; end;
 if not blocked then raise exception 'Member inserted pilot record'; end if;
 perform public.record_pilot_activity(); perform public.record_pilot_activity();
 insert into test_results values('membro: leitura própria, sem promoção, sem administração e sem escrita do piloto',true);
 perform set_config('request.jwt.claim.sub',(select id::text from test_context where key='pastor_a'),true);
 select count(*) into n from public.get_church_members();
 if n<>1 or not exists(select 1 from public.get_church_members() where user_id=a) then raise exception 'Pastor A isolation'; end if;
 if exists(select 1 from public.get_church_members() where user_id=b) then raise exception 'Pastor A sees B'; end if;
 perform public.get_church_average_radar(); perform public.get_church_prayer_targets(); perform public.get_church_total_disciples();
 insert into test_results values('pastor A: somente igreja A, quatro funções pastorais executadas',true);
 perform set_config('request.jwt.claim.sub',(select id::text from test_context where key='pastor_b'),true);
 if not exists(select 1 from public.get_church_members() where user_id=b) or exists(select 1 from public.get_church_members() where user_id=a) then raise exception 'Pastor B isolation'; end if;
 insert into test_results values('pastor B: somente igreja B',true);
 perform set_config('request.jwt.claim.sub',(select id::text from test_context where key='pastor_none'),true);
 select count(*) into n from public.get_church_members();
 if n<>0 then raise exception 'Unassigned pastor sees unassigned users'; end if;
 if public.get_church_total_disciples()<>0 or public.get_church_prayer_targets()<>0 then raise exception 'Unassigned aggregates'; end if;
 insert into test_results values('pastor sem igreja: não visualiza participantes sem igreja',true);
 perform set_config('request.jwt.claim.sub','c1417348-eb7c-4b93-8df6-63838c43ffe0',true);
 perform public.admin_get_overview(); perform public.admin_get_all_members();
 perform public.admin_find_user_by_email('member_a@example.invalid');
 perform public.admin_assign_member(a,(select id from test_context where key='church_b'));
 perform public.admin_set_pastor(a,c);
 blocked=false;
 begin perform public.admin_create_igreja('  '); exception when others then blocked=true; end;
 if not blocked then raise exception 'Empty church accepted'; end if;
 perform public.admin_create_igreja('TESTE AUTOMÁTICO criação via RPC');
 insert into public.pilot_records(igreja_id,kind,payload) values(c,'igreja','{"convidados":"5"}');
 if not exists(select 1 from public.pilot_records where igreja_id=c) then raise exception 'Admin record persistence'; end if;
 blocked=false;
 begin update public.pilot_records set payload='{}' where igreja_id=c; exception when insufficient_privilege then blocked=true; end;
 if not blocked then raise exception 'History editable'; end if;
 perform public.admin_pilot_metrics(current_date,current_date);
 insert into test_results values('administrador: busca, vínculo, promoção, criação, métricas e registro; histórico imutável',true);
end $test$;
reset role;
do $test$ begin
 if (select count(*) from public.pilot_activity where user_id=(select id from test_context where key='member_a'))<>1 then raise exception 'Duplicate usage'; end if;
 if has_function_privilege('anon','public.admin_get_all_members()','execute') then raise exception 'Anon RPC'; end if;
 insert into test_results values('uso diário sem duplicação e execução anônima bloqueada',true);
end $test$;
select * from test_results;

rollback;
