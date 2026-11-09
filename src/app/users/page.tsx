import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canManageUser, canSeeUser, readMember } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { AddUserForm } from "./add-user-form";
import { UserRow } from "./user-row";

export const metadata: Metadata = {
  title: "Users · BPO Lead Finder",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requireAdmin();
  const isOwner = actor.role === "owner";
  const { data, error } =
    await createSupabaseAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const emailsById = new Map(
    data.users.map((user) => [user.id, user.email ?? ""]),
  );
  const users = data.users
    .map((user) => ({ user, member: readMember(user) }))
    .filter(({ member }) => canSeeUser(actor, member))
    .map(({ user, member }) => ({
      id: user.id,
      email: user.email ?? "",
      role: member.role,
      lastSignInAt: user.last_sign_in_at ?? null,
      addedBy: member.createdBy
        ? (emailsById.get(member.createdBy) ?? null)
        : null,
      isCurrentUser: user.id === actor.id,
      canManage: canManageUser(actor, member),
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Users</h1>
          </CardTitle>
          <CardDescription>
            {isOwner
              ? "As the owner, you see everyone and can change any role. Nobody can change yours."
              : "You see the people you added, and can change their roles or remove them."}{" "}
            Users can run searches and export results; admins can also add
            people.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="-mx-6 border-y [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  {isOwner && (
                    <TableHead className="hidden lg:table-cell">
                      Added by
                    </TableHead>
                  )}
                  <TableHead className="hidden md:table-cell">
                    Last sign-in
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} showAddedBy={isOwner} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddUserForm />
    </div>
  );
}
