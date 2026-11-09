"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { TableCell, TableRow } from "@/components/ui/table";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { changeRole, removeUser } from "./actions";

type User = {
  id: string;
  email: string;
  role: Role;
  lastSignInAt: string | null;
  addedBy: string | null;
  isCurrentUser: boolean;
  canManage: boolean;
};

const EMPTY_STATE = { error: null, message: null };

function formatSignIn(lastSignInAt: string | null) {
  if (!lastSignInAt) return "Never";
  return new Date(lastSignInAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserRow({
  user,
  showAddedBy,
}: {
  user: User;
  showAddedBy: boolean;
}) {
  const [roleState, roleAction, isSavingRole] = useActionState(
    changeRole,
    EMPTY_STATE,
  );
  const [removeState, removeAction, isRemoving] = useActionState(
    removeUser,
    EMPTY_STATE,
  );
  const error = roleState.error ?? removeState.error;

  function confirmRemoval(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(`Remove ${user.email}? They won't be able to log in.`)
    ) {
      event.preventDefault();
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <p className="wrap-anywhere font-medium">
          {user.email}
          {user.isCurrentUser && (
            <Badge variant="secondary" className="ml-2">
              You
            </Badge>
          )}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </TableCell>
      {showAddedBy && (
        <TableCell className="hidden whitespace-normal text-muted-foreground lg:table-cell">
          <span className="wrap-anywhere">
            {user.addedBy ?? "Not recorded"}
          </span>
        </TableCell>
      )}
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {formatSignIn(user.lastSignInAt)}
      </TableCell>
      <TableCell>
        {!user.canManage ? (
          ROLE_LABELS[user.role]
        ) : (
          <form action={roleAction}>
            <input type="hidden" name="userId" value={user.id} />
            <NativeSelect
              name="role"
              defaultValue={user.role}
              disabled={isSavingRole}
              aria-label={`Role for ${user.email}`}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {ROLE_LABELS[role]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </form>
        )}
      </TableCell>
      <TableCell className="text-right">
        {user.canManage && (
          <form action={removeAction} onSubmit={confirmRemoval}>
            <input type="hidden" name="userId" value={user.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isRemoving}
              aria-label={`Remove ${user.email}`}
              title={`Remove ${user.email}`}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </form>
        )}
      </TableCell>
    </TableRow>
  );
}
