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
import { readRole } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { AddUserForm } from "./add-user-form";
import { UserRow } from "./user-row";

export const metadata: Metadata = {
  title: "Users · BPO Lead Finder",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const { data, error } =
    await createSupabaseAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const users = data.users
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      role: readRole(user.app_metadata),
      lastSignInAt: user.last_sign_in_at ?? null,
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
            Admins can add users and change roles. Users can run searches and
            export results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="-mx-6 border-y [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
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
                  <UserRow
                    key={user.id}
                    user={user}
                    isCurrentUser={user.id === admin.id}
                  />
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
