begin;
create temp table admin_test_fixture(kind text primary key,id uuid default gen_random_uuid());
insert into admin_test_fixture(kind) values('admin_a'),('admin_b'),('member');
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,kind||'@rota29-test.invalid','authenticated','authenticated','{}','{}',now(),now() from admin_test_fixture;
update public.user_roles set is_super_admin=true where user_id in(select id from admin_test_fixture where kind like 'admin_%');
grant select on admin_test_fixture to authenticated;
set local role authenticated;
do $test$
declare a record; result jsonb; denied boolean;
begin
 for a in select id from admin_test_fixture where kind like 'admin_%' loop
  perform set_config('request.jwt.claim.sub',a.id::text,true);
  if public.pilot_my_church()->>'is_admin'<>'true' then raise exception 'Missing administrative access';end if;
  result:=public.rota29_admin_complete_day('house',1);
  if result->>'day_index'<>'2' then raise exception 'Admin test journey failed';end if;
  if public.pilot_my_church()->>'is_admin'<>'true' then raise exception 'Lost administrative access';end if;
  denied:=false;
  begin perform public.rota29_admin_complete_day('house',2);exception when others then denied:=true;end;
  if not denied then raise exception 'Daily limit bypass';end if;
 end loop;
 perform set_config('request.jwt.claim.sub',(select id::text from admin_test_fixture where kind='member'),true);
 denied:=false;
 begin perform public.rota29_admin_complete_day('house',1);exception when others then denied:=true;end;
 if not denied then raise exception 'Member accessed admin test';end if;
 if has_function_privilege('anon','public.rota29_admin_complete_day(text,integer)','execute') then raise exception 'Anonymous execute';end if;
end $test$;
reset role;
select 'both admins retain privileges and personal progression; member and anonymous blocked; daily limit preserved' as test,true as passed;
rollback;
