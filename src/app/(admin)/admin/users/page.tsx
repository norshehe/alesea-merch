import { MailPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { requireAdmin } from "@/features/admin/server/auth";
import { InvitationActions } from "@/features/admin/users/components/invitation-actions";
import { InviteAdminDialog } from "@/features/admin/users/components/invite-admin-dialog";
import { RemoveAdminButton } from "@/features/admin/users/components/remove-admin-button";
import {
  listAdminUsers,
  listOpenInvitations,
} from "@/features/admin/users/server/user.queries";
import { adminDisplayName } from "@/features/admin/users/lib/format";
import { formatManilaDate } from "@/lib/format";

/**
 * Who can sign in to the admin, and who has been asked to.
 *
 * All admins are equal: anyone here can invite, resend, revoke, or remove
 * anyone but themselves. The guards that matter (self, last admin) are enforced
 * on the server; this page only declines to offer what would be refused.
 *
 * Only OPEN invitations are listed. An accepted invite shows up as an admin
 * above it, and a revoked one needs no decision.
 */

export default async function AdminUsersPage() {
  // `requireAdmin()` is cached per request with the layout's call, so this costs
  // nothing — and it is the session, not anything in the URL, that says "you".
  const [me, admins, invitations] = await Promise.all([
    requireAdmin(),
    listAdminUsers(),
    listOpenInvitations(),
  ]);

  // `invited_by` points at auth.users, which RLS will not let us join; the
  // admin list is the readable half of that, and an inviter who has since been
  // removed simply goes unnamed.
  const inviterNames = new Map(
    admins.map((admin) => [admin.id, adminDisplayName(admin)]),
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in to this admin. All admins have the same access."
        actions={<InviteAdminDialog />}
      />

      <section className="grid gap-3" aria-labelledby="admins-heading">
        <h2 id="admins-heading" className="text-sm font-semibold">
          Admins
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isMe = admin.id === me.id;
                const label = adminDisplayName(admin);
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">
                          {admin.name?.trim() || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                        {isMe ? <Badge variant="secondary">You</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatManilaDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isMe ? null : (
                        <RemoveAdminButton userId={admin.id} label={label} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-10 grid gap-3" aria-labelledby="invitations-heading">
        <h2 id="invitations-heading" className="text-sm font-semibold">
          Invitations
        </h2>
        {invitations.length === 0 ? (
          <EmptyState
            icon={MailPlus}
            title="No open invitations"
            description="Invite someone and they'll appear here until they sign in for the first time."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const inviter = invitation.invitedBy
                      ? inviterNames.get(invitation.invitedBy)
                      : undefined;
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <span className="grid">
                            <span className="font-medium">{invitation.email}</span>
                            {invitation.name ? (
                              <span className="text-muted-foreground text-xs">
                                {invitation.name}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-1.5">
                            {invitation.status === "expired" ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                            <span className="text-muted-foreground text-xs whitespace-nowrap">
                              {invitation.status === "expired"
                                ? `on ${formatManilaDate(invitation.expiresAt)}`
                                : `until ${formatManilaDate(invitation.expiresAt)}`}
                            </span>
                            {/* Never emailed: SendGrid was down or unconfigured
                                when it was sent, so the invitee may not know. */}
                            {invitation.lastSentAt ? null : (
                              <Badge variant="secondary">Not emailed</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatManilaDate(invitation.createdAt)}
                          {inviter ? (
                            <span className="block text-xs">by {inviter}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <InvitationActions
                            id={invitation.id}
                            email={invitation.email}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-muted-foreground text-xs">
              An invitation is used up the first time its person signs in. Resend
              also restarts its 7 days, so it works for expired ones too.
            </p>
          </>
        )}
      </section>
    </>
  );
}
