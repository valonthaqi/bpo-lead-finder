import { z } from "zod";
import { readRole, type Role } from "./roles";

export type Member = { id: string; role: Role; createdBy: string | null };

export function readMember(user: {
  id: string;
  app_metadata: unknown;
}): Member {
  const createdBy = z
    .object({ created_by: z.uuid() })
    .safeParse(user.app_metadata);
  return {
    id: user.id,
    role: readRole(user.app_metadata),
    createdBy: createdBy.success ? createdBy.data.created_by : null,
  };
}

export function canSeeUser(actor: Member, target: Member) {
  if (actor.role === "owner") return true;
  if (actor.role !== "admin") return false;
  return target.id === actor.id || target.createdBy === actor.id;
}

export function canManageUser(actor: Member, target: Member) {
  if (target.id === actor.id || target.role === "owner") return false;
  if (actor.role === "owner") return true;
  return actor.role === "admin" && target.createdBy === actor.id;
}
