-- ROTA29 institutional model, transaction-safe non-destructive tests.
-- Run the COMPLETE file. The rollback removes all synthetic accounts/records.
begin;
update public.rota29_pilot_policy set starts_on=(now() at time zone 'America/Sao_Paulo')::date-1,
 ends_on=(now() at time zone 'America/Sao_Paulo')::date+28;
create temp table rota29_test_accounts (kind text primary key, id uuid default gen_random_uuid());
insert into rota29_test_accounts(kind) values
 ('pastor_a'),('pastor_b'),('member_a'),('member_b'),('individual'),('admin');
grant select on rota29_test_accounts to authenticated;
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,kind||'@rota29-example.invalid','authenticated','authenticated',
 '{}'::jsonb,'{}'::jsonb,now(),now()
from rota29_test_accounts;
update public.user_roles set is_super_admin=true where user_id=(select id from rota29_test_accounts where kind='admin');
set local role authenticated;
do $test$
declare
 a uuid;b uuid;m uuid;n uuid;individual_id uuid;
 ia jsonb;ib jsonb;report jsonb;result jsonb;denied boolean;
begin
 select id into a from rota29_test_accounts where kind='pastor_a';
 select id into b from rota29_test_accounts where kind='pastor_b';
 select id into m from rota29_test_accounts where kind='member_a';
 select id into n from rota29_test_accounts where kind='member_b';
 select id into individual_id from rota29_test_accounts where kind='individual';
 perform set_config('request.jwt.claim.sub',a::text,true);
 ia:=public.pilot_register_church('Igreja A de teste','Macapá','AP','Pastor A','teste@example.invalid',20,true);
 perform set_config('request.jwt.claim.sub',b::text,true);
 ib:=public.pilot_register_church('Igreja B de teste','Belém','PA','Pastor B','teste@example.invalid',15,true);
 perform set_config('request.jwt.claim.sub',(select id::text from rota29_test_accounts where kind='admin'),true);
 perform public.rota29_admin_approve_church((ia->>'igreja_id')::uuid,true);
 perform public.rota29_admin_approve_church((ib->>'igreja_id')::uuid,true);
 if ia->>'codigo_convite'=ib->>'codigo_convite' then raise exception 'Repeated invite code'; end if;
 perform set_config('request.jwt.claim.sub',m::text,true);
 result:=public.pilot_join_church(ia->>'codigo_convite');
 if result->>'nome'<>'Igreja A de teste' then raise exception 'Join church A failed'; end if;
 denied:=false;
 begin perform public.pilot_join_church(ib->>'codigo_convite'); exception when others then denied:=true; end;
 if not denied then raise exception 'Member changed institution using another code'; end if;
 denied:=false;
 begin perform public.rota29_pastoral_dashboard(); exception when others then denied:=true; end;
 if not denied then raise exception 'Member accessed pastoral dashboard'; end if;
 perform set_config('request.jwt.claim.sub',n::text,true);
 result:=public.pilot_join_church(ib->>'codigo_convite');
 perform set_config('request.jwt.claim.sub',individual_id::text,true);
 result:=public.rota29_choose_basic();
 if result->>'individual'<>'true' then raise exception 'BASIC unavailable'; end if;
 if public.pilot_my_church()->>'individual'<>'true' then raise exception 'Individual access state missing'; end if;
 result:=public.pilot_complete_day('house',1);
 if result->>'day_index'<>'2' then raise exception 'BASIC day progress failed'; end if;
 denied:=false;
 begin perform public.pilot_complete_day('house',2); exception when others then denied:=true; end;
 if not denied then raise exception 'Multiple day advances accepted'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 report:=public.rota29_pastoral_dashboard();
 if (report->'totals'->>'members')::integer<>1 or
  report->'members'->0->>'user_id'<>m::text then raise exception 'Church A data isolation failed'; end if;
 if report->'members'->0->>'practice_intimidade' is null then raise exception 'Practice count missing'; end if;
 result:=public.rota29_set_pastoral_alert(14);
 report:=public.rota29_pastoral_dashboard();
 if report->>'alert_after_days'<>'14' then raise exception 'Configurable alert failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 report:=public.rota29_pastoral_dashboard();
 if (report->'totals'->>'members')::integer<>1 or
  report->'members'->0->>'user_id'<>n::text then raise exception 'Church B data isolation failed'; end if;
 raise notice 'ROTA29 v2: ALL institutional role, BASIC, church isolation, progression and reporting checks passed';
end $test$;
reset role;
rollback;
