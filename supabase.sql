-- OD Approval System database
-- Run this entire script in Supabase > SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.od_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  registration_no text not null check (length(trim(registration_no)) between 1 and 30),
  student_name text not null check (length(trim(student_name)) between 1 and 100),
  email text not null,
  course_code text not null,
  course_slot text not null,
  event_name text not null,
  event_date date not null,
  event_incharge_name text not null,
  contact text not null,
  status text not null default 'Pending'
    check (status in ('Pending','Approved','Disapproved')),
  admin_comment text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists od_requests_user_id_idx on public.od_requests(user_id);
create index if not exists od_requests_status_idx on public.od_requests(status);
create index if not exists od_requests_event_date_idx on public.od_requests(event_date);

alter table public.profiles enable row level security;
alter table public.od_requests enable row level security;

-- Helper function: returns true when the logged-in user is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: users can read their own profile; admins can read all profiles.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

-- Students can create requests only for themselves.
drop policy if exists "students_insert_own_request" on public.od_requests;
create policy "students_insert_own_request"
on public.od_requests for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student'
  )
);

-- Students can see only their own requests; admins can see all.
drop policy if exists "select_own_or_admin_requests" on public.od_requests;
create policy "select_own_or_admin_requests"
on public.od_requests for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Only admins can change status/comments.
drop policy if exists "admin_update_requests" on public.od_requests;
create policy "admin_update_requests"
on public.od_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Optional: prevent normal users from deleting requests.
drop policy if exists "no_delete_requests" on public.od_requests;
create policy "no_delete_requests"
on public.od_requests for delete
to authenticated
using (public.is_admin());

-- IMPORTANT:
-- After creating users in Authentication, insert their profile rows.
-- Replace the UUID/email values with the actual Supabase Auth user IDs.
--
-- Example:
-- insert into public.profiles (id, email, role)
-- values ('AUTH-USER-UUID-HERE', 'teacher@example.com', 'admin');
--
-- insert into public.profiles (id, email, role)
-- values ('AUTH-USER-UUID-HERE', 'student@example.com', 'student');
