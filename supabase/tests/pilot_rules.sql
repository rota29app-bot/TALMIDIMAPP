begin;
update public.rota29_pilot_policy set starts_on=(now() at time zone 'America/Sao_Paulo')::date-1,
 ends_on=(now() at time zone 'America/Sao_Paulo')::date+28;
create temp table rules_fixture(kind text primary key,id uuid default gen_random_uuid());
insert into rules_fixture(kind) values('admin'),('pastor'),('legacy');
insert into rules_fixture(kind) select 'member_'||n from generate_series(1,11) n;
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,kind||'@pilot-rules.invalid','authenticated','authenticated','{}','{}',now(),now() from rules_fixture;
update public.user_roles set is_super_admin=true where user_id=(select id from rules_fixture where kind='admin');
create temp table rules_church(id uuid,code text);
grant select on rules_fixture to authenticated;
grant select,insert on rules_church to authenticated;
set local role authenticated;
do $test$
declare result jsonb; church uuid; code text; a record; denied boolean;
begin
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='pastor'),true);
 result:=public.pilot_register_church('Igreja teste regras','Macapá','AP','Pastor de teste','teste@example.invalid',10,true);
 church:=(result->>'igreja_id')::uuid;code:=result->>'codigo_convite';
 insert into rules_church values(church,code);
 if public.rota29_pilot_access()->>'status'<>'pending' then raise exception 'Approval missing';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_1'),true);
 denied:=false;begin perform public.pilot_join_church(code);exception when others then denied:=true;end;
 if not denied then raise exception 'Unapproved church accepted member';end if;
 denied:=false;begin perform public.rota29_admin_approve_church(church,true);exception when others then denied:=true;end;
 if not denied then raise exception 'Member approved church';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='admin'),true);
 perform public.rota29_admin_approve_church(church,true);
 for a in select id from rules_fixture where kind like 'member_%' and kind<>'member_11' loop
  perform set_config('request.jwt.claim.sub',a.id::text,true);
  perform public.pilot_join_church(code);
 end loop;
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_11'),true);
 denied:=false;begin perform public.pilot_join_church(code);exception when others then denied:=true;end;
 if not denied then raise exception '11th seat accepted';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_1'),true);
 result:=public.pilot_complete_day('house',1);
 if result->>'day_index'<>'2' then raise exception 'First day unavailable';end if;
 denied:=false;begin perform public.pilot_complete_day('house',2);exception when others then denied:=true;end;
 if not denied then raise exception 'Daily duplicate accepted';end if;
 if (select count(*) from public.user_daily_progress where user_id=auth.uid())<>1 then raise exception 'Same-day read unavailable';end if;
end $test$;
reset role;
insert into public.user_daily_progress(user_id,stage_id,day_index,updated_at)
select id,'house',21,now()-interval '2 days' from rules_fixture where kind='member_2';
set local role authenticated;
do $test$
begin
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_2'),true);
 perform public.pilot_complete_day('house',21);
 if public.rota29_pilot_access()->>'status'<>'completed' then raise exception 'Badge did not close journey';end if;
 if exists(select 1 from public.user_daily_progress where user_id=auth.uid()) then raise exception 'Completed access not restricted';end if;
end $test$;
reset role;
update public.rota29_pilot_policy set starts_on=(now() at time zone 'America/Sao_Paulo')::date+1,
 ends_on=(now() at time zone 'America/Sao_Paulo')::date+30;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_1'),true);
do $test$ begin
 if public.rota29_pilot_access()->>'status'<>'scheduled' then raise exception 'Start date missing';end if;
end $test$;
reset role;
update public.rota29_pilot_policy set starts_on=(now() at time zone 'America/Sao_Paulo')::date-30,
 ends_on=(now() at time zone 'America/Sao_Paulo')::date-1;
set local role authenticated;
do $test$
declare denied boolean:=false;
begin
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='member_1'),true);
 if public.rota29_pilot_access()->>'status'<>'expired' then raise exception 'Expiry missing';end if;
 if exists(select 1 from public.user_daily_progress where user_id=auth.uid()) then raise exception 'Expired data readable';end if;
 begin perform public.pilot_complete_day('house',2);exception when others then denied:=true;end;
 if not denied then raise exception 'Expired progress accepted';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='admin'),true);
 if public.rota29_pilot_access()->>'status'<>'admin' then raise exception 'Admin locked out';end if;
 perform public.rota29_admin_pilot_churches();
 perform set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='pastor'),true);
 if public.rota29_pilot_access()->>'status'<>'pastor' then raise exception 'Pastor report access lost';end if;
 if has_function_privilege('anon','public.rota29_admin_approve_church(uuid,boolean)','execute') then raise exception 'Anonymous admin access';end if;
end $test$;
reset role;
insert into public.igrejas(nome) values('Arquivo técnico sintético') returning id;
update public.user_roles set igreja_id=(select id from public.igrejas where nome='Arquivo técnico sintético')
where user_id=(select id from rules_fixture where kind='legacy');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from rules_fixture where kind='legacy'),true);
do $test$ begin
 if public.rota29_pilot_access()->>'status'<>'archived' then raise exception 'Legacy pilot access not blocked';end if;
end $test$;
reset role;
select 'approval, 10 members plus pastor, daily progress, badge closure, expiry, data restrictions, admin/pastor continuity and legacy separation' as test,true as passed;
rollback;
