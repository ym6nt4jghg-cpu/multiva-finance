begin;

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit enable row level security;
revoke all on table public.admin_audit from anon, authenticated;
grant all on table public.admin_audit to service_role;

create or replace function private.bootstrap_finance_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'gabrielaleferrari@icloud.com' then
    insert into private.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.bootstrap_finance_admin() from public, anon, authenticated;

drop trigger if exists finance_admin_bootstrap on auth.users;
create trigger finance_admin_bootstrap
after insert or update of email on auth.users
for each row execute function private.bootstrap_finance_admin();

insert into private.admin_users (user_id)
select id from auth.users
where lower(email) = 'gabrielaleferrari@icloud.com'
on conflict (user_id) do nothing;

commit;
