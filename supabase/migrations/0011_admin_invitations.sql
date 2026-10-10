-- In-app admin invitations, and the admin list that manages them.
--
-- Until now an admin was provisioned by hand: create the auth user in the
-- Supabase dashboard, then insert the `admin_users` row in SQL. This adds an
-- invitation record that an existing admin creates from `/admin/users`, which
-- the sign-in flow redeems the first time the invitee types a valid code.
--
-- NOTHING HERE MINTS A SESSION FROM A URL. The invite email carries a plain
-- `/login` link and no token; the invitee still signs in with a typed OTP code,
-- because Microsoft Safe Links prefetches every URL in an inbound message and
-- burns single-use grants before the human clicks. `inviteUserByEmail` and
-- `generateLink` are deliberately not used for the same reason.
--
-- All admins are equal: there are no roles, so there is no column for one.

-- ---------------------------------------------------------------------------
-- 1. Invitations.
-- ---------------------------------------------------------------------------

create table public.admin_invitations (
  id           uuid primary key default gen_random_uuid(),
  -- Stored normalised so the open-invite index and every lookup compare like
  -- with like. The check makes a forgotten `lower()` in app code fail loudly
  -- instead of creating a second, unmatchable invitation for the same person.
  email        text not null
               constraint admin_invitations_email_normalised
               check (email = lower(btrim(email)) and email like '%_@_%'),
  name         text,
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  -- Null until an email has actually gone out. An invite whose send failed is
  -- still valid — the inviter is told to pass the word on by hand.
  last_sent_at timestamptz,
  constraint admin_invitations_single_outcome
    check (accepted_at is null or revoked_at is null)
);

comment on table public.admin_invitations is
  'Pending/settled admin invites. Redeemed by accept_admin_invitation() after a typed OTP sign-in. No token is ever stored or emailed.';

-- One OPEN invitation per address. Expired-but-open rows still hold the slot on
-- purpose: Resend revives them, so a second row would only be a duplicate.
-- Accepted and revoked rows fall out, so a removed admin can be invited again.
create unique index admin_invitations_open_email_key
  on public.admin_invitations (email)
  where accepted_at is null and revoked_at is null;

-- Covers the FK so deleting an inviter's auth user does not seq-scan this table.
create index admin_invitations_invited_by_idx
  on public.admin_invitations (invited_by);

alter table public.admin_invitations enable row level security;

-- Admins read the list through the cookie-bound client, so RLS is what scopes
-- it. There are NO write policies: every insert/update goes through a Server
-- Action holding the service-role key, after `requireAdmin()`. Anon gets
-- nothing at all — not even table privileges — because an invite list is a
-- list of who is about to get access to the admin.
create policy admin_invitations_admin_read on public.admin_invitations
  for select to authenticated
  using ((select private.is_admin()));

revoke all on public.admin_invitations from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.admin_invitations from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Let admins see every admin.
--
-- Replaces `admin_users_self_read` rather than adding a second policy beside
-- it: two permissive SELECT policies for the same role are evaluated for every
-- row and the performance advisor flags the overlap. Self-read is kept as the
-- first disjunct, so `getAdminUser()` keeps working exactly as before.
-- `private.is_admin()` is SECURITY DEFINER, so its own read of admin_users
-- bypasses this policy and cannot recurse.
-- ---------------------------------------------------------------------------

drop policy admin_users_self_read on public.admin_users;

create policy admin_users_read on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- 3. Redeem an invitation.
--
-- Called by `verifyAdminOtp` (service role) right after a code is verified, so
-- `p_user_id` is a user who has just proven they own the mailbox. The function
-- still re-checks that the auth user's email IS the invited address: the caller
-- is trusted, but a mismatched pair must never turn into an admin row.
--
-- `for update` on the invitation serialises two concurrent sign-ins by the same
-- person, so the invite is consumed exactly once.
-- ---------------------------------------------------------------------------

create function public.accept_admin_invitation(p_user_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email  text := lower(btrim(p_email));
  v_invite public.admin_invitations%rowtype;
begin
  select * into v_invite
    from public.admin_invitations
   where email = v_email
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   for update;

  if not found then
    return false;
  end if;

  if not exists (
    select 1 from auth.users u
     where u.id = p_user_id and lower(u.email) = v_email
  ) then
    return false;
  end if;

  insert into public.admin_users (user_id, email, name)
  values (p_user_id, v_email, v_invite.name)
  on conflict (user_id) do nothing;

  update public.admin_invitations
     set accepted_at = now()
   where id = v_invite.id;

  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Remove an admin, never the last one.
--
-- A count-then-delete in application code is a race: two admins removing each
-- other at the same moment would both see "2 admins" and leave zero, and with
-- invite-only sign-up nobody could get back in without dashboard SQL.
-- SHARE ROW EXCLUSIVE conflicts with itself and with every row write, so
-- concurrent removals queue behind one another and each sees the real count.
-- Reads (including every RLS `is_admin()` check) are unaffected.
--
-- Returns 'removed' | 'not_found' | 'last_admin' so the action can word each
-- outcome; an exception would only have to be string-matched back apart.
-- The self-removal guard lives in the Server Action, which knows the session.
-- ---------------------------------------------------------------------------

create function public.remove_admin_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  lock table public.admin_users in share row exclusive mode;

  if not exists (select 1 from public.admin_users where user_id = p_user_id) then
    return 'not_found';
  end if;

  if (select count(*) from public.admin_users) <= 1 then
    return 'last_admin';
  end if;

  delete from public.admin_users where user_id = p_user_id;
  return 'removed';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Revoke an invitation.
--
-- `sendSignInCode` creates the auth user the first time an invitee asks for a
-- code, so a revoked invite can leave an auth user behind who would otherwise
-- keep being able to request codes (landing on /not-authorized). This returns
-- that user's id — only when they never became an admin — so the action can
-- delete them through the Auth admin API. supabase-js has no lookup-by-email,
-- and doing it here keeps the revoke and the lookup in one statement.
--
-- `revoked` is false when the invitation was not open (already accepted,
-- already revoked, or gone), and nothing is changed.
-- ---------------------------------------------------------------------------

create function public.revoke_admin_invitation(p_invitation_id uuid)
returns table (revoked boolean, orphan_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  update public.admin_invitations
     set revoked_at = now()
   where id = p_invitation_id
     and accepted_at is null
     and revoked_at is null
  returning email into v_email;

  if v_email is null then
    return query select false, null::uuid;
    return;
  end if;

  return query
    select true,
           (select u.id
              from auth.users u
             where lower(u.email) = v_email
               and not exists (
                 select 1 from public.admin_users a where a.user_id = u.id
               )
             limit 1);
end $$;

-- ---------------------------------------------------------------------------
-- 6. Lock the functions down (same treatment as 0007/0010).
--
-- They live in `public` so the service-role client can reach them with
-- `.rpc()`, which means PostgREST would publish them to anyone holding the
-- anon key. A new function grants EXECUTE to PUBLIC by default; revoke that
-- and grant only `service_role`, the one caller.
-- ---------------------------------------------------------------------------

revoke all on function public.accept_admin_invitation(uuid, text) from public, anon, authenticated;
revoke all on function public.remove_admin_user(uuid) from public, anon, authenticated;
revoke all on function public.revoke_admin_invitation(uuid) from public, anon, authenticated;

grant execute on function public.accept_admin_invitation(uuid, text) to service_role;
grant execute on function public.remove_admin_user(uuid) to service_role;
grant execute on function public.revoke_admin_invitation(uuid) to service_role;
