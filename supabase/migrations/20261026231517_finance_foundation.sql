-- Multiva Finance only. Apply exclusively to a dedicated, empty Supabase project.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check(length(name)<=80), timezone text not null default 'America/Sao_Paulo',
 terms_version text not null default '2026-10-26', created_at timestamptz not null default now()
);
create table public.financial_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 80), type text not null check(type in ('digital','checking','cash','wallet')),
 opening_cents bigint not null default 0 check(opening_cents between 0 and 10000000000),
 created_at timestamptz not null default now(), unique(id,user_id),unique(user_id,name)
);
create table public.transaction_categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 60),created_at timestamptz not null default now(),unique(user_id,name)
);
create table public.credit_cards (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 80),limit_cents bigint not null check(limit_cents between 1 and 10000000000),
 closing_day int not null check(closing_day between 1 and 28),due_day int not null check(due_day between 1 and 28),
 created_at timestamptz not null default now(),unique(id,user_id)
);
create table public.financial_transactions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid,card_id uuid,description text not null check(length(description) between 2 and 140),
 amount_cents bigint not null check(amount_cents between 1 and 10000000000),kind text not null check(kind in ('income','expense')),
 category text not null check(length(category) between 1 and 60),date date not null,
 status text not null default 'paid' check(status in ('paid','pending')),notes text not null default '' check(length(notes)<=500),
 idempotency_key uuid not null,installment_group uuid,installment_number int,installment_count int,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key),unique(installment_group,installment_number),unique(id,user_id),
 foreign key(account_id,user_id) references public.financial_accounts(id,user_id),
 foreign key(card_id,user_id) references public.credit_cards(id,user_id),
 check(card_id is null or (account_id is null and kind='expense' and status='paid')),
 check((card_id is null and installment_group is null and installment_number is null and installment_count is null) or
 (card_id is not null and installment_group is not null and installment_number between 1 and installment_count and installment_count between 1 and 48))
);
create index transactions_owner_date on public.financial_transactions(user_id,date desc);
create index transactions_account on public.financial_transactions(account_id,user_id);
create index transactions_card_month on public.financial_transactions(card_id,date);
create table public.savings_goals (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 80),target_cents bigint not null check(target_cents between 1 and 10000000000),
 saved_cents bigint not null default 0 check(saved_cents between 0 and 10000000000),deadline date,created_at timestamptz not null default now()
);
create table public.budgets (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(length(category) between 1 and 60),limit_cents bigint not null check(limit_cents between 1 and 10000000000),
 month date not null check(extract(day from month)=1),created_at timestamptz not null default now(),unique(user_id,category,month)
);
create table public.recurring_transactions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 description text not null check(length(description) between 2 and 80),amount_cents bigint not null check(amount_cents between 1 and 10000000000),
 category text not null check(length(category) between 1 and 60),next_date date not null,active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.account_transfers (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 from_account uuid not null,to_account uuid not null,amount_cents bigint not null check(amount_cents between 1 and 10000000000),
 date date not null,idempotency_key uuid not null,created_at timestamptz not null default now(),unique(user_id,idempotency_key),
 check(from_account<>to_account),
 foreign key(from_account,user_id) references public.financial_accounts(id,user_id),
 foreign key(to_account,user_id) references public.financial_accounts(id,user_id)
);
create table public.statement_payments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 card_id uuid not null,account_id uuid not null,month date not null check(extract(day from month)=1),
 amount_cents bigint not null check(amount_cents>0),date date not null,idempotency_key uuid not null,
 created_at timestamptz not null default now(),unique(user_id,idempotency_key),unique(card_id,month),
 foreign key(card_id,user_id) references public.credit_cards(id,user_id),
 foreign key(account_id,user_id) references public.financial_accounts(id,user_id)
);
create table public.subscription_plans (
 id text primary key,name text not null,product_id text unique,offer_id text unique,checkout_url text,
 price_cents bigint check(price_cents>0),period_days int not null default 30 check(period_days between 1 and 366),
 enabled boolean not null default false,monthly_messages int not null default 100 check(monthly_messages between 1 and 10000),
 created_at timestamptz not null default now()
);
insert into public.subscription_plans(id,name) values('start','Start'),('pro','Pro'),('premium','Premium');
create table public.subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,plan_id text not null references public.subscription_plans(id),
 provider_subscription_id text unique,status text not null check(status in ('pending','active','past_due','canceled','refunded','chargeback','paused')),
 current_period_end timestamptz,last_event_at timestamptz,last_order_id text,created_at timestamptz not null default now()
);
create table public.checkout_sessions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 plan_id text not null references public.subscription_plans(id),expires_at timestamptz not null default now()+interval '1 day',
 created_at timestamptz not null default now()
);
create table public.whatsapp_identities (
 user_id uuid primary key references auth.users(id) on delete cascade,phone text not null unique check(phone~'^[1-9][0-9]{7,14}$'),
 verified_at timestamptz not null default now(),notifications boolean not null default false,last_inbound_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.whatsapp_link_tokens (
 user_id uuid primary key references auth.users(id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.webhook_jobs (
 id uuid primary key default gen_random_uuid(),provider text not null check(provider in ('whatsapp','cakto')),
 external_id text not null,payload jsonb not null,status text not null default 'pending' check(status in ('pending','processing','done','failed')),
 attempts int not null default 0,available_at timestamptz not null default now(),locked_at timestamptz,last_error text,
 created_at timestamptz not null default now(),unique(provider,external_id)
);
create index webhook_jobs_pending on public.webhook_jobs(available_at) where status in ('pending','processing');
create table public.payment_events (
 id uuid primary key default gen_random_uuid(),external_id text not null unique,event text not null,order_id text not null,
 user_id uuid references auth.users(id) on delete set null,amount_cents bigint not null default 0,currency text not null default 'BRL',
 created_at timestamptz not null default now()
);
create table public.ai_usage (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'reserved',input_tokens int not null default 0 check(input_tokens>=0),output_tokens int not null default 0 check(output_tokens>=0),
 created_at timestamptz not null default now()
);
create index ai_usage_user_created on public.ai_usage(user_id,created_at desc);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,
 entity text not null,entity_id uuid,action text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
create index audit_owner_created on public.audit_logs(user_id,created_at desc);
create table public.support_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check(length(subject) between 3 and 120),message text not null check(length(message) between 10 and 2000),
 status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now()
);
create table private.admin_users(user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.admin_users enable row level security;

-- Default deny for every exposed table. Explicit grants accompany explicit ownership policies.
do $$ declare t text;begin
 for t in select tablename from pg_tables where schemaname='public' loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 for t in select unnest(array['financial_accounts','transaction_categories','savings_goals','budgets','recurring_transactions']) loop
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create index %I on public.%I(user_id)',t||'_owner',t);
 end loop;
 for t in select unnest(array['credit_cards','financial_transactions','account_transfers','statement_payments','subscriptions','checkout_sessions','whatsapp_identities','ai_usage','audit_logs','support_requests']) loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy read_own on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;
end $$;
grant select,update on public.profiles to authenticated;
create policy profile_owner on public.profiles for all to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
grant insert on public.credit_cards to authenticated;
create policy card_insert on public.credit_cards for insert to authenticated with check((select auth.uid())=user_id);
grant insert,update,delete on public.financial_transactions to authenticated;
create policy transaction_insert on public.financial_transactions for insert to authenticated with check((select auth.uid())=user_id and card_id is null and installment_group is null);
create policy transaction_update on public.financial_transactions for update to authenticated using((select auth.uid())=user_id and card_id is null) with check((select auth.uid())=user_id and card_id is null and installment_group is null);
create policy transaction_delete on public.financial_transactions for delete to authenticated using((select auth.uid())=user_id and card_id is null);
grant select on public.subscription_plans to authenticated;
create policy plans_read on public.subscription_plans for select to authenticated using(enabled);
grant insert on public.support_requests to authenticated;
create policy support_insert on public.support_requests for insert to authenticated with check((select auth.uid())=user_id and status='open');
grant all on all tables in schema public to service_role;

-- Auth bootstrap is not an externally callable function.
create function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),80));
 insert into public.financial_accounts(user_id,name,type) values(new.id,'Minha conta','digital');
 return new;
end $$;
revoke all on function private.bootstrap_user() from public,anon,authenticated;
create trigger finance_user_created after insert on auth.users for each row execute function private.bootstrap_user();

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb;begin
 r=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 -- Cascade account deletion should not resurrect the deleted user's audit data.
 if exists(select 1 from auth.users where id=(r->>'user_id')::uuid) then
 insert into public.audit_logs(user_id,entity,entity_id,action,before_data,after_data)
 values((r->>'user_id')::uuid,TG_TABLE_NAME,(r->>'id')::uuid,TG_OP,
 case when TG_OP<>'INSERT' then to_jsonb(old) else null end,
 case when TG_OP<>'DELETE' then to_jsonb(new) else null end);
 end if;return coalesce(new,old);
end $$;
revoke all on function private.audit_change() from public,anon,authenticated;
do $$ declare t text;begin
 foreach t in array array['financial_transactions','financial_accounts','savings_goals','budgets','credit_cards','account_transfers','statement_payments'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
 end loop;end $$;

create function private.transfer_funds(p_from uuid,p_to uuid,p_amount bigint,p_date date,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result uuid;begin
 if u is null or not private.can_write_finance() then raise exception 'Subscription or authentication required';end if;
 if not exists(select 1 from public.financial_accounts where id=p_from and user_id=u) or not exists(select 1 from public.financial_accounts where id=p_to and user_id=u) then raise exception 'Invalid accounts';end if;
 insert into public.account_transfers(user_id,from_account,to_account,amount_cents,date,idempotency_key)
 values(u,p_from,p_to,p_amount,p_date,p_key) on conflict(user_id,idempotency_key) do nothing returning id into result;
 return coalesce(result,(select id from public.account_transfers where user_id=u and idempotency_key=p_key));
end $$;
create function public.transfer_funds(p_from uuid,p_to uuid,p_amount bigint,p_date date,p_key uuid) returns uuid language sql security invoker set search_path='' as $$select private.transfer_funds(p_from,p_to,p_amount,p_date,p_key)$$;

create function private.record_card_purchase(p_card uuid,p_description text,p_amount bigint,p_count int,p_date date,p_category text,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();c public.credit_cards;first_month date;m date;portion bigint;i int;begin
 if u is null or not private.can_write_finance() or p_count<1 or p_count>48 or p_amount<p_count or p_amount>10000000000 then raise exception 'Invalid purchase';end if;
 select * into c from public.credit_cards where id=p_card and user_id=u for update;
 if not found then raise exception 'Invalid card';end if;
 if exists(select 1 from public.financial_transactions where user_id=u and installment_group=p_key) then return p_key;end if;
 first_month=date_trunc('month',p_date)::date;
 if extract(day from p_date)>=c.closing_day then first_month=(first_month+interval '1 month')::date;end if;
 if c.due_day<=c.closing_day then first_month=(first_month+interval '1 month')::date;end if;
 for i in 1..p_count loop
 m=(first_month+make_interval(months=>i-1))::date;
 if exists(select 1 from public.statement_payments where card_id=p_card and month=m) then raise exception 'Statement already settled';end if;
 portion=p_amount/p_count+case when i<=p_amount%p_count then 1 else 0 end;
 insert into public.financial_transactions(user_id,card_id,description,amount_cents,kind,category,date,status,idempotency_key,installment_group,installment_number,installment_count)
 values(u,p_card,left(p_description,128)||case when p_count>1 then ' ('||i||'/'||p_count||')' else '' end,portion,'expense',p_category,m+(c.due_day-1),'paid',gen_random_uuid(),p_key,i,p_count);
 end loop;return p_key;
end $$;
create function public.record_card_purchase(p_card uuid,p_description text,p_amount bigint,p_count int,p_date date,p_category text,p_key uuid) returns uuid language sql security invoker set search_path='' as $$select private.record_card_purchase(p_card,p_description,p_amount,p_count,p_date,p_category,p_key)$$;

create function private.pay_statement(p_card uuid,p_month date,p_account uuid,p_date date,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();total bigint;result uuid;begin
 if u is null or not private.can_write_finance() then raise exception 'Subscription or authentication required';end if;
 perform 1 from public.credit_cards where id=p_card and user_id=u for update;
 if not found or not exists(select 1 from public.financial_accounts where id=p_account and user_id=u) then raise exception 'Invalid owner';end if;
 select id into result from public.statement_payments where user_id=u and idempotency_key=p_key;
 if result is not null then return result;end if;
 select sum(amount_cents) into total from public.financial_transactions where user_id=u and card_id=p_card and date>=p_month and date<(p_month+interval '1 month');
 if total is null or total<=0 then raise exception 'Empty statement';end if;
 insert into public.statement_payments(user_id,card_id,account_id,month,amount_cents,date,idempotency_key) values(u,p_card,p_account,p_month,total,p_date,p_key) returning id into result;
 return result;
end $$;
create function public.pay_statement(p_card uuid,p_month date,p_account uuid,p_date date,p_key uuid) returns uuid language sql security invoker set search_path='' as $$select private.pay_statement(p_card,p_month,p_account,p_date,p_key)$$;

create function private.reserve_ai_request() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r uuid;begin
 if u is null or not private.can_write_finance() then raise exception 'Subscription or authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if (select count(*) from public.ai_usage where user_id=u and created_at>now()-interval '1 minute')>=6 or
 (select count(*) from public.ai_usage where user_id=u and created_at>date_trunc('day',now()))>=100 then return null;end if;
 insert into public.ai_usage(user_id) values(u) returning id into r;return r;
end $$;
create function public.reserve_ai_request() returns uuid language sql security invoker set search_path='' as $$select private.reserve_ai_request()$$;
create function private.complete_ai_request(p_id uuid,p_provider text,p_input int,p_output int) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 update public.ai_usage set provider=left(p_provider,30),input_tokens=p_input,output_tokens=p_output where id=p_id and user_id=auth.uid() and provider='reserved';
end $$;
create function public.complete_ai_request(p_id uuid,p_provider text,p_input int,p_output int) returns void language sql security invoker set search_path='' as $$select private.complete_ai_request(p_id,p_provider,p_input,p_output)$$;

do $$ declare f record;begin
 for f in select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname in ('transfer_funds','record_card_purchase','pay_statement','reserve_ai_request','complete_ai_request') loop
 execute 'revoke all on function '||f.sig||' from public,anon';
 execute 'grant execute on function '||f.sig||' to authenticated';
 end loop;end $$;

-- Operational RPCs are service-role only. No financial details enter the admin view.
create function public.claim_webhook_job() returns setof public.webhook_jobs language sql security invoker set search_path='' as $$
 update public.webhook_jobs set status='processing',locked_at=now(),attempts=attempts+1 where id=(
 select id from public.webhook_jobs where (status='pending' and available_at<=now()) or (status='processing' and locked_at<now()-interval '5 minutes')
 order by created_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.claim_webhook_job() from public,anon,authenticated;
grant execute on function public.claim_webhook_job() to service_role;
create function private.admin_metrics() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from private.admin_users where user_id=auth.uid()) then raise exception 'Forbidden';end if;
 return jsonb_build_object('users',(select count(*) from public.profiles),'active_subscriptions',(select count(*) from public.subscriptions where status='active' and current_period_end>now()),'pending_jobs',(select count(*) from public.webhook_jobs where status in ('pending','processing')),'failed_jobs',(select count(*) from public.webhook_jobs where status='failed'),'ai_requests',(select count(*) from public.ai_usage),'input_tokens',(select coalesce(sum(input_tokens),0) from public.ai_usage),'output_tokens',(select coalesce(sum(output_tokens),0) from public.ai_usage),'open_support',(select count(*) from public.support_requests where status='open'));
end $$;
create function public.admin_metrics() returns jsonb language sql security invoker set search_path='' as $$select private.admin_metrics()$$;
revoke all on function private.admin_metrics(),public.admin_metrics() from public,anon;
grant execute on function private.admin_metrics(),public.admin_metrics() to authenticated;
create table public.assistant_drafts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 source_message text not null unique,intent jsonb not null,expires_at timestamptz not null default now()+interval '10 minutes',
 transaction_id uuid,created_at timestamptz not null default now()
);
create table public.whatsapp_outbox (
 id uuid primary key default gen_random_uuid(),source_message text not null unique,phone text not null,body text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','unknown','failed')),
 provider_message_id text,created_at timestamptz not null default now(),sent_at timestamptz
);
alter table public.assistant_drafts enable row level security;
alter table public.whatsapp_outbox enable row level security;
revoke all on public.assistant_drafts,public.whatsapp_outbox from anon,authenticated;
grant all on public.assistant_drafts,public.whatsapp_outbox to service_role;

create function public.link_whatsapp(p_hash text,p_phone text) returns uuid language plpgsql security invoker set search_path='' as $$
declare u uuid;begin
 select user_id into u from public.whatsapp_link_tokens where token_hash=p_hash and expires_at>now() for update;
 if u is null then raise exception 'Link expired';end if;
 if not exists(select 1 from public.subscriptions where user_id=u and status='active' and current_period_end>now()) then raise exception 'Subscription required';end if;
 insert into public.whatsapp_identities(user_id,phone,last_inbound_at) values(u,p_phone,now())
 on conflict(user_id) do update set phone=excluded.phone,verified_at=now(),last_inbound_at=now(),notifications=false;
 delete from public.whatsapp_link_tokens where user_id=u;return u;
end $$;
revoke all on function public.link_whatsapp(text,text) from public,anon,authenticated;
grant execute on function public.link_whatsapp(text,text) to service_role;

create function public.confirm_whatsapp_draft(p_phone text,p_draft uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare u uuid;d public.assistant_drafts;r uuid;a uuid;begin
 select user_id into u from public.whatsapp_identities where phone=p_phone;
 if u is null or not exists(select 1 from public.subscriptions where user_id=u and status='active' and current_period_end>now()) then raise exception 'Unauthorized';end if;
 select * into d from public.assistant_drafts where id=p_draft and user_id=u for update;
 if not found then raise exception 'Unknown draft';end if;
 if d.transaction_id is not null then return d.transaction_id;end if;
 if d.expires_at<=now() then raise exception 'Draft expired';end if;
 select id into a from public.financial_accounts where user_id=u order by created_at limit 1;
 insert into public.financial_transactions(user_id,account_id,description,amount_cents,kind,category,date,status,idempotency_key)
 values(u,a,d.intent->>'description',(d.intent->>'amount_cents')::bigint,d.intent->>'kind',d.intent->>'category',(d.intent->>'date')::date,'paid',d.id) returning id into r;
 update public.assistant_drafts set transaction_id=r where id=d.id;return r;
end $$;
revoke all on function public.confirm_whatsapp_draft(text,uuid) from public,anon,authenticated;
grant execute on function public.confirm_whatsapp_draft(text,uuid) to service_role;

create function public.apply_cakto_event(p_external_id text,p_event text,p_order text,p_callback uuid,p_product text,p_offer text,p_subscription text,p_status text,p_amount bigint,p_currency text,p_paid_at timestamptz) returns text language plpgsql security invoker set search_path='' as $$
declare plan public.subscription_plans;u uuid;existing public.subscriptions;begin
 -- This function is reachable only with service credentials. Never map by email or browser-supplied user ID.
 select * into plan from public.subscription_plans where product_id=p_product and offer_id=p_offer and enabled for share;
 if not found then raise exception 'Unknown product or disabled plan';end if;
 select user_id into u from public.checkout_sessions where id=p_callback and plan_id=plan.id;
 if u is null and p_subscription is not null then select user_id into u from public.subscriptions where provider_subscription_id=p_subscription;end if;
 if u is null then raise exception 'Unmapped payment';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,1));
 if exists(select 1 from public.payment_events where external_id=p_external_id) then return 'duplicate';end if;
 select * into existing from public.subscriptions where user_id=u for update;
 if p_event in ('purchase_approved','subscription_renewed','subscription_late_recovered') then
  if p_status<>'paid' or p_currency<>'BRL' or p_amount<>plan.price_cents or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'Unconfirmed payment';end if;
  if existing.status in ('canceled','refunded','chargeback','paused') then raise exception 'Manual provider reconciliation required before reactivation';end if;
  if existing.last_event_at is null or p_paid_at>existing.last_event_at then
   insert into public.subscriptions(user_id,plan_id,provider_subscription_id,status,current_period_end,last_event_at,last_order_id)
   values(u,plan.id,p_subscription,'active',p_paid_at+make_interval(days=>plan.period_days),p_paid_at,p_order)
   on conflict(user_id) do update set plan_id=excluded.plan_id,provider_subscription_id=coalesce(excluded.provider_subscription_id,public.subscriptions.provider_subscription_id),status='active',current_period_end=excluded.current_period_end,last_event_at=excluded.last_event_at,last_order_id=excluded.last_order_id;
  end if;
 elsif p_event in ('refund','chargeback','subscription_canceled','subscription_paused') then
  insert into public.subscriptions(user_id,plan_id,provider_subscription_id,status,last_order_id)
  values(u,plan.id,p_subscription,case p_event when 'refund' then 'refunded' when 'chargeback' then 'chargeback' when 'subscription_paused' then 'paused' else 'canceled' end,p_order)
  on conflict(user_id) do update set status=excluded.status;
 elsif p_event in ('subscription_late','subscription_renewal_refused') then
  update public.subscriptions set status='past_due' where user_id=u and status='active' and current_period_end<=now();
 elsif p_event='subscription_resumed' then raise exception 'Provider reconciliation required';
 end if;
 insert into public.payment_events(external_id,event,order_id,user_id,amount_cents,currency) values(p_external_id,p_event,p_order,u,p_amount,p_currency);
 return 'processed';
end $$;
revoke all on function public.apply_cakto_event(text,text,text,uuid,text,text,text,text,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_cakto_event(text,text,text,uuid,text,text,text,text,bigint,text,timestamptz) to service_role;

create function public.financial_summary(p_month date) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
 'income',coalesce((select sum(amount_cents) from public.financial_transactions where kind='income' and status='paid' and date>=p_month and date<p_month+interval '1 month'),0),
 'expense',coalesce((select sum(amount_cents) from public.financial_transactions where kind='expense' and status='paid' and date>=p_month and date<p_month+interval '1 month'),0),
 'balance',coalesce((select sum(opening_cents) from public.financial_accounts),0)+coalesce((select sum(case when kind='income' then amount_cents else -amount_cents end) from public.financial_transactions where status='paid' and card_id is null),0)-coalesce((select sum(amount_cents) from public.statement_payments),0)
 );
$$;
revoke all on function public.financial_summary(date) from public,anon;
grant execute on function public.financial_summary(date) to authenticated;
create table public.media_imports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,fingerprint text not null,created_at timestamptz not null default now(),unique(user_id,fingerprint));
alter table public.media_imports enable row level security;
revoke all on public.media_imports from public,anon,authenticated;
grant select on public.media_imports to authenticated;
grant all on public.media_imports to service_role;
create policy media_owner on public.media_imports for select to authenticated using((select auth.uid())=user_id);
create function private.reserve_media_request(p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r uuid;begin
 if u is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'Unauthorized';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2));
 if (select count(*) from public.media_imports where user_id=u and created_at>now()-interval '1 day')>=10 then return null;end if;
 insert into public.media_imports(user_id,fingerprint) values(u,p_hash) on conflict(user_id,fingerprint) do nothing returning id into r;return r;
end $$;
create function public.reserve_media_request(p_hash text) returns uuid language sql security invoker set search_path='' as $$select private.reserve_media_request(p_hash)$$;
revoke all on function private.reserve_media_request(text),public.reserve_media_request(text) from public,anon;
grant execute on function private.reserve_media_request(text),public.reserve_media_request(text) to authenticated;
create table private.runtime_settings(id boolean primary key default true check(id),billing_required boolean not null default false);
insert into private.runtime_settings default values;
alter table private.runtime_settings enable row level security;
create function private.can_write_finance() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (not (select billing_required from private.runtime_settings where id) or exists(select 1 from public.subscriptions where user_id=auth.uid() and status='active' and current_period_end>now()));
$$;
revoke all on function private.can_write_finance() from public,anon;
grant execute on function private.can_write_finance() to authenticated;
-- Restrictive policies combine with ownership policies and preserve read/export/delete after expiration.
do $$ declare t text;begin
 foreach t in array array['financial_accounts','transaction_categories','savings_goals','budgets','recurring_transactions','credit_cards','financial_transactions'] loop
 execute format('create policy billing_insert on public.%I as restrictive for insert to authenticated with check((select private.can_write_finance()))',t);
 execute format('create policy billing_update on public.%I as restrictive for update to authenticated using((select private.can_write_finance())) with check((select private.can_write_finance()))',t);
 end loop;end $$;
commit;
