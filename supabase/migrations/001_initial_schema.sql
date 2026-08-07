create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('ADMIN', 'MANAGER', 'SALESPERSON');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.account_status as enum ('ACTIVE', 'INACTIVE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.dispatch_status as enum ('ACTIVE', 'DELETED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.item_status as enum ('ACTIVE', 'SOLD', 'DROP', 'DELETED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sale_status as enum ('SOLD');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.trash_status as enum ('SOLD', 'DROP', 'DELETED');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.dispatch_number_seq start with 1 increment by 1;

create or replace function public.generate_dispatch_number()
returns text
language plpgsql
as $$
declare
  next_value bigint;
begin
  next_value := nextval('public.dispatch_number_seq');
  return 'GLD-' || to_char(next_value, 'FM000000');
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text not null,
  name text not null,
  email text,
  auth_email text not null,
  role public.user_role not null,
  status public.account_status not null default 'ACTIVE',
  first_login boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_employee_id_not_blank check (btrim(employee_id) <> ''),
  constraint users_name_not_blank check (btrim(name) <> ''),
  constraint users_employee_id_unique unique (employee_id),
  constraint users_email_unique unique (email),
  constraint users_auth_email_unique unique (auth_email)
);

create table if not exists public.dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number text not null default public.generate_dispatch_number(),
  created_by uuid not null references public.users(id) on delete restrict,
  status public.dispatch_status not null default 'ACTIVE',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispatches_dispatch_number_not_blank check (btrim(dispatch_number) <> ''),
  constraint dispatches_dispatch_number_unique unique (dispatch_number),
  constraint dispatches_deleted_at_matches_status check (
    (status = 'DELETED' and deleted_at is not null)
    or (status = 'ACTIVE' and deleted_at is null)
  )
);

create table if not exists public.dispatch_assignments (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  salesperson_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  constraint dispatch_assignments_unique unique (dispatch_id, salesperson_id)
);

create table if not exists public.dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  item_number text not null,
  gross_weight numeric(12,3) not null,
  total_stone_weight numeric(12,3) not null default 0,
  pearl_weight numeric(12,3) not null default 0,
  ad_weight numeric(12,3) generated always as (total_stone_weight - pearl_weight) stored,
  net_weight numeric(12,3) generated always as (gross_weight - total_stone_weight) stored,
  description text not null default 'Gold Ornament',
  is_verified boolean not null default false,
  status public.item_status not null default 'ACTIVE',
  created_by uuid not null references public.users(id) on delete restrict,
  deleted_by uuid references public.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispatch_items_item_number_not_blank check (btrim(item_number) <> ''),
  constraint dispatch_items_unique_item_per_dispatch unique (dispatch_id, item_number),
  constraint dispatch_items_weights_non_negative check (
    gross_weight > 0
    and total_stone_weight >= 0
    and pearl_weight >= 0
  ),
  constraint dispatch_items_pearl_not_gt_stone check (pearl_weight <= total_stone_weight),
  constraint dispatch_items_gross_not_lt_stone check (gross_weight >= total_stone_weight),
  constraint dispatch_items_archive_matches_status check (
    (status = 'ACTIVE' and archived_at is null)
    or (status <> 'ACTIVE' and archived_at is not null)
  )
);

create table if not exists public.sales_history (
  id uuid primary key default gen_random_uuid(),
  dispatch_item_id uuid not null references public.dispatch_items(id) on delete restrict,
  dispatch_id uuid not null references public.dispatches(id) on delete restrict,
  salesperson_id uuid not null references public.users(id) on delete restrict,
  sale_status public.sale_status not null default 'SOLD',
  gross_weight numeric(12,3) not null,
  total_stone_weight numeric(12,3) not null default 0,
  pearl_weight numeric(12,3) not null default 0,
  ad_weight numeric(12,3) generated always as (total_stone_weight - pearl_weight) stored,
  net_weight numeric(12,3) generated always as (gross_weight - total_stone_weight) stored,
  remarks text not null default '',
  sold_at timestamptz not null default now(),
  constraint sales_history_one_sale_per_item unique (dispatch_item_id),
  constraint sales_history_weights_non_negative check (
    gross_weight > 0
    and total_stone_weight >= 0
    and pearl_weight >= 0
  ),
  constraint sales_history_pearl_not_gt_stone check (pearl_weight <= total_stone_weight),
  constraint sales_history_gross_not_lt_stone check (gross_weight >= total_stone_weight)
);

create table if not exists public.drop_history (
  id uuid primary key default gen_random_uuid(),
  dispatch_item_id uuid not null references public.dispatch_items(id) on delete restrict,
  dispatch_id uuid not null references public.dispatches(id) on delete restrict,
  salesperson_id uuid not null references public.users(id) on delete restrict,
  gross_weight numeric(12,3) not null,
  total_stone_weight numeric(12,3) not null default 0,
  pearl_weight numeric(12,3) not null default 0,
  ad_weight numeric(12,3) generated always as (total_stone_weight - pearl_weight) stored,
  net_weight numeric(12,3) generated always as (gross_weight - total_stone_weight) stored,
  remarks text not null default '',
  dropped_at timestamptz not null default now(),
  constraint drop_history_one_drop_per_item unique (dispatch_item_id),
  constraint drop_history_weights_non_negative check (
    gross_weight > 0
    and total_stone_weight >= 0
    and pearl_weight >= 0
  ),
  constraint drop_history_pearl_not_gt_stone check (pearl_weight <= total_stone_weight),
  constraint drop_history_gross_not_lt_stone check (gross_weight >= total_stone_weight)
);

create table if not exists public.trash_history (
  id uuid primary key default gen_random_uuid(),
  dispatch_item_id uuid not null references public.dispatch_items(id) on delete restrict,
  dispatch_id uuid not null references public.dispatches(id) on delete restrict,
  salesperson_id uuid references public.users(id) on delete set null,
  deleted_by uuid references public.users(id) on delete set null,
  status public.trash_status not null,
  remarks text not null default '',
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint trash_history_one_current_record_per_item unique (dispatch_item_id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint activity_logs_action_not_blank check (btrim(action) <> ''),
  constraint activity_logs_description_not_blank check (btrim(description) <> '')
);

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint settings_key_not_blank check (btrim(key) <> '')
);

create or replace function public.ensure_salesperson_assignment_target()
returns trigger
language plpgsql
as $$
declare
  target_role public.user_role;
begin
  select role into target_role
  from public.users
  where id = new.salesperson_id;

  if target_role is distinct from 'SALESPERSON' then
    raise exception 'Dispatch assignments can only target SALESPERSON users';
  end if;

  return new;
end;
$$;

create or replace function public.touch_dispatch_from_child()
returns trigger
language plpgsql
as $$
declare
  target_dispatch_id uuid;
begin
  target_dispatch_id := coalesce(new.dispatch_id, old.dispatch_id);

  update public.dispatches
  set updated_at = now()
  where id = target_dispatch_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists dispatches_set_updated_at on public.dispatches;
create trigger dispatches_set_updated_at
before update on public.dispatches
for each row execute function public.set_updated_at();

drop trigger if exists dispatch_items_set_updated_at on public.dispatch_items;
create trigger dispatch_items_set_updated_at
before update on public.dispatch_items
for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists dispatch_assignments_validate_salesperson on public.dispatch_assignments;
create trigger dispatch_assignments_validate_salesperson
before insert or update on public.dispatch_assignments
for each row execute function public.ensure_salesperson_assignment_target();

drop trigger if exists dispatch_items_touch_dispatch on public.dispatch_items;
create trigger dispatch_items_touch_dispatch
after insert or update or delete on public.dispatch_items
for each row execute function public.touch_dispatch_from_child();

drop trigger if exists dispatch_assignments_touch_dispatch on public.dispatch_assignments;
create trigger dispatch_assignments_touch_dispatch
after insert or update or delete on public.dispatch_assignments
for each row execute function public.touch_dispatch_from_child();

create index if not exists users_role_status_idx on public.users(role, status);
create index if not exists users_employee_id_upper_idx on public.users(upper(employee_id));
create index if not exists users_name_upper_idx on public.users(upper(name));
create index if not exists dispatches_created_at_idx on public.dispatches(created_at desc);
create index if not exists dispatches_status_created_at_idx on public.dispatches(status, created_at desc);
create index if not exists dispatch_assignments_salesperson_idx on public.dispatch_assignments(salesperson_id, dispatch_id);
create index if not exists dispatch_items_dispatch_status_idx on public.dispatch_items(dispatch_id, status);
create index if not exists dispatch_items_status_created_at_idx on public.dispatch_items(status, created_at desc);
create index if not exists sales_history_salesperson_sold_at_idx on public.sales_history(salesperson_id, sold_at desc);
create index if not exists sales_history_dispatch_idx on public.sales_history(dispatch_id);
create index if not exists drop_history_salesperson_dropped_at_idx on public.drop_history(salesperson_id, dropped_at desc);
create index if not exists drop_history_dispatch_idx on public.drop_history(dispatch_id);
create index if not exists trash_history_deleted_by_idx on public.trash_history(deleted_by, deleted_at desc);
create index if not exists trash_history_salesperson_expires_idx on public.trash_history(salesperson_id, expires_at);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_user_created_at_idx on public.activity_logs(user_id, created_at desc);

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role::text
  from public.users
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() = 'ADMIN'
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('ADMIN', 'MANAGER')
$$;

create or replace function public.has_dispatch_assignment(target_dispatch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.dispatch_assignments da
    where da.dispatch_id = target_dispatch_id
      and da.salesperson_id = auth.uid()
  )
$$;

alter table public.users enable row level security;
alter table public.dispatches enable row level security;
alter table public.dispatch_assignments enable row level security;
alter table public.dispatch_items enable row level security;
alter table public.sales_history enable row level security;
alter table public.drop_history enable row level security;
alter table public.trash_history enable row level security;
alter table public.activity_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
for select
using (id = auth.uid());

drop policy if exists users_manager_salesperson_select on public.users;
create policy users_manager_salesperson_select on public.users
for select
using (public.current_user_role() = 'MANAGER' and role = 'SALESPERSON');

drop policy if exists dispatches_manager_admin_all on public.dispatches;
create policy dispatches_manager_admin_all on public.dispatches
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists dispatches_salesperson_select_assigned on public.dispatches;
create policy dispatches_salesperson_select_assigned on public.dispatches
for select
using (status = 'ACTIVE' and public.has_dispatch_assignment(id));

drop policy if exists dispatch_assignments_manager_admin_all on public.dispatch_assignments;
create policy dispatch_assignments_manager_admin_all on public.dispatch_assignments
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists dispatch_assignments_salesperson_select_own on public.dispatch_assignments;
create policy dispatch_assignments_salesperson_select_own on public.dispatch_assignments
for select
using (salesperson_id = auth.uid());

drop policy if exists dispatch_items_manager_admin_all on public.dispatch_items;
create policy dispatch_items_manager_admin_all on public.dispatch_items
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists dispatch_items_salesperson_select_assigned on public.dispatch_items;
create policy dispatch_items_salesperson_select_assigned on public.dispatch_items
for select
using (status = 'ACTIVE' and public.has_dispatch_assignment(dispatch_id));

drop policy if exists dispatch_items_salesperson_verify_assigned on public.dispatch_items;
drop policy if exists dispatch_items_salesperson_update_assigned on public.dispatch_items;
create policy dispatch_items_salesperson_update_assigned on public.dispatch_items
for update
using (status = 'ACTIVE' and public.has_dispatch_assignment(dispatch_id))
with check (status = 'ACTIVE' and public.has_dispatch_assignment(dispatch_id));

drop policy if exists sales_history_manager_admin_all on public.sales_history;
create policy sales_history_manager_admin_all on public.sales_history
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists sales_history_salesperson_own on public.sales_history;
create policy sales_history_salesperson_own on public.sales_history
for all
using (salesperson_id = auth.uid())
with check (salesperson_id = auth.uid() and public.has_dispatch_assignment(dispatch_id));

drop policy if exists drop_history_manager_admin_all on public.drop_history;
create policy drop_history_manager_admin_all on public.drop_history
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists drop_history_salesperson_own on public.drop_history;
create policy drop_history_salesperson_own on public.drop_history
for all
using (salesperson_id = auth.uid())
with check (salesperson_id = auth.uid() and public.has_dispatch_assignment(dispatch_id));

drop policy if exists trash_history_manager_admin_all on public.trash_history;
create policy trash_history_manager_admin_all on public.trash_history
for all
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists trash_history_salesperson_own_unexpired on public.trash_history;
create policy trash_history_salesperson_own_unexpired on public.trash_history
for all
using (salesperson_id = auth.uid() and expires_at > now())
with check (salesperson_id = auth.uid() and expires_at > now());

drop policy if exists activity_logs_manager_admin_select on public.activity_logs;
create policy activity_logs_manager_admin_select on public.activity_logs
for select
using (public.is_manager_or_admin());

drop policy if exists activity_logs_user_insert_own on public.activity_logs;
create policy activity_logs_user_insert_own on public.activity_logs
for insert
with check (user_id = auth.uid());

drop policy if exists settings_authenticated_select on public.settings;
create policy settings_authenticated_select on public.settings
for select
using (auth.uid() is not null);

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings
for all
using (public.is_admin())
with check (public.is_admin());

grant execute on function public.generate_dispatch_number() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_manager_or_admin() to authenticated, service_role;
grant execute on function public.has_dispatch_assignment(uuid) to authenticated, service_role;
