-- Only a CONFIRMED auth user may redeem an admin invitation.
--
-- 0011's accept_admin_invitation matched the invited address against
-- auth.users.email, but an unconfirmed address is just a claim: whoever created
-- the user typed it, and nobody has proven they read that mailbox. Every path
-- this app takes produces a confirmed user (`provisionInvitedUser` creates with
-- `email_confirm: true`, and a verified OTP confirms the address), so this
-- changes nothing for real invitees. It closes the door on a user that reached
-- auth.users some other way — a dashboard slip, a future signup path — being
-- promoted on the strength of an address it never verified.
--
-- `create or replace` keeps the function's OID and therefore its ACL, but the
-- revoke/grant is restated so this file is correct on its own (0007/0010's
-- rule: never trust a function's grants to survive a redefinition).

create or replace function public.accept_admin_invitation(p_user_id uuid, p_email text)
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
     where u.id = p_user_id
       and lower(u.email) = v_email
       and u.email_confirmed_at is not null
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

revoke all on function public.accept_admin_invitation(uuid, text) from public, anon, authenticated;
grant execute on function public.accept_admin_invitation(uuid, text) to service_role;
