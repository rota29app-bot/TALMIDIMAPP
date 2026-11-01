begin;
update public.rota29_pilot_policy set starts_on=(now() at time zone 'America/Sao_Paulo')::date-1, ends_on=(now() at time zone 'America/Sao_Paulo')::date+28;
create temporary table badge_fixture(id uuid);
insert into badge_fixture values(gen_random_uuid());
insert into auth.users(id,email,aud,role,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,'badge-check@rota29-example.invalid','authenticated','authenticated','{}','{}',now(),now() from badge_fixture;
grant select on badge_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from badge_fixture),true);
select public.rota29_choose_basic();
reset role;
insert into public.user_daily_progress(user_id,stage_id,day_index,updated_at)
select id,'house',21,now()-interval '2 days' from badge_fixture
on conflict(user_id,stage_id) do update set day_index=21,updated_at=now()-interval '2 days';
set local role authenticated;
do $test$
declare outcome jsonb; denied boolean:=false;
begin
 if exists(select 1 from public.user_badges where user_id=auth.uid() and badge_id='house') then raise exception 'Premature badge';end if;
 outcome:=public.pilot_complete_day('house',21);
 if outcome->>'first_badge'<>'true' or not exists(select 1 from public.user_badges where user_id=auth.uid() and badge_id='house') then raise exception 'Day21 badge missing';end if;
 begin perform public.pilot_complete_day('house',21);exception when others then denied:=true;end;
 if not denied then raise exception 'Repeated completion accepted';end if;
 denied:=false;
 begin perform public.pilot_complete_day('clinic',1);exception when others then denied:=true;end;
 if not denied then raise exception 'Non-pilot station accepted';end if;
end $test$;
reset role;
select 'badge boundary and pilot station restrictions' as test,true as passed;
rollback;
