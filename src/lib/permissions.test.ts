import { describe, expect, it } from "vitest";
import {
  canManageUser,
  canViewSearch,
  canSeeUser,
  readMember,
  type Member,
} from "./permissions";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_ADMIN_ID = "00000000-0000-4000-8000-000000000003";

const owner: Member = { id: OWNER_ID, role: "owner", createdBy: null };
const admin: Member = { id: ADMIN_ID, role: "admin", createdBy: OWNER_ID };
const otherAdmin: Member = {
  id: OTHER_ADMIN_ID,
  role: "admin",
  createdBy: OWNER_ID,
};
const addedByAdmin: Member = {
  id: "00000000-0000-4000-8000-000000000004",
  role: "user",
  createdBy: ADMIN_ID,
};
const addedByOtherAdmin: Member = {
  id: "00000000-0000-4000-8000-000000000005",
  role: "user",
  createdBy: OTHER_ADMIN_ID,
};
const addedBeforeTracking: Member = {
  id: "00000000-0000-4000-8000-000000000006",
  role: "user",
  createdBy: null,
};
const user: Member = {
  ...addedByAdmin,
  id: "00000000-0000-4000-8000-000000000007",
};

describe("readMember", () => {
  it("reads the role and who added the user", () => {
    expect(
      readMember({
        id: ADMIN_ID,
        app_metadata: {
          role: "admin",
          created_by: OWNER_ID,
          provider: "email",
        },
      }),
    ).toEqual(admin);
  });

  it("treats a missing or malformed creator as unknown", () => {
    expect(
      readMember({ id: ADMIN_ID, app_metadata: { role: "user" } }).createdBy,
    ).toBeNull();
    expect(
      readMember({
        id: ADMIN_ID,
        app_metadata: { role: "user", created_by: "someone" },
      }).createdBy,
    ).toBeNull();
  });
});

describe("canSeeUser", () => {
  it("lets the owner see everyone", () => {
    for (const target of [
      admin,
      otherAdmin,
      addedByOtherAdmin,
      addedBeforeTracking,
    ]) {
      expect(canSeeUser(owner, target)).toBe(true);
    }
  });

  it("lets an admin see only themselves and the users they added", () => {
    expect(canSeeUser(admin, admin)).toBe(true);
    expect(canSeeUser(admin, addedByAdmin)).toBe(true);
    expect(canSeeUser(admin, owner)).toBe(false);
    expect(canSeeUser(admin, otherAdmin)).toBe(false);
    expect(canSeeUser(admin, addedByOtherAdmin)).toBe(false);
    expect(canSeeUser(admin, addedBeforeTracking)).toBe(false);
  });

  it("lets a user see nobody", () => {
    expect(canSeeUser(user, addedByAdmin)).toBe(false);
  });
});

describe("canManageUser", () => {
  it("never lets anyone manage the owner, including the owner", () => {
    expect(canManageUser(owner, owner)).toBe(false);
    expect(canManageUser(admin, owner)).toBe(false);
  });

  it("lets the owner manage every admin and user", () => {
    expect(canManageUser(owner, admin)).toBe(true);
    expect(canManageUser(owner, addedByOtherAdmin)).toBe(true);
    expect(canManageUser(owner, addedBeforeTracking)).toBe(true);
  });

  it("lets an admin manage only the users they added", () => {
    expect(canManageUser(admin, addedByAdmin)).toBe(true);
    expect(canManageUser(admin, otherAdmin)).toBe(false);
    expect(canManageUser(admin, addedByOtherAdmin)).toBe(false);
  });

  it("never lets anyone manage themselves", () => {
    expect(canManageUser(admin, admin)).toBe(false);
  });

  it("never lets a user manage anyone", () => {
    expect(canManageUser({ ...user, role: "user" }, addedByAdmin)).toBe(false);
  });
});

describe("canViewSearch", () => {
  it("lets the owner view every search, including ones with no recorded user", () => {
    expect(canViewSearch(owner, { userId: ADMIN_ID })).toBe(true);
    expect(canViewSearch(owner, { userId: null })).toBe(true);
  });

  it("lets everyone else view only their own searches", () => {
    expect(canViewSearch(admin, { userId: ADMIN_ID })).toBe(true);
    expect(canViewSearch(admin, { userId: OTHER_ADMIN_ID })).toBe(false);
    expect(canViewSearch(admin, { userId: null })).toBe(false);
    expect(canViewSearch(addedByAdmin, { userId: ADMIN_ID })).toBe(false);
  });
});
