import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/roles";
import { getSignedInUser } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Account · BPO Lead Finder",
};

export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto grid max-w-xl gap-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Account</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 wrap-anywhere font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="mt-1 font-medium">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <ChangePasswordForm />
    </div>
  );
}
