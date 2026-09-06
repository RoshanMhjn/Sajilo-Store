import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeRole, DEMO_USERS, ROLE_PERMISSIONS } from "./auth";

describe("auth demo roles", () => {
  it("normalizes aliases for admin and manager roles", () => {
    assert.equal(normalizeRole("superadmin"), "super_admin");
    assert.equal(normalizeRole("admin"), "super_admin");
    assert.equal(normalizeRole("store_manager"), "manager");
    assert.equal(normalizeRole("inventory_staff"), "staff");
    assert.equal(normalizeRole("accountant"), "billing");
  });

  it("includes demo credentials for all role paths", () => {
    const emails = new Set(DEMO_USERS.map((user) => user.email));
    [
      "admin@store.com",
      "superadmin@store.com",
      "manager@store.com",
      "cashier@store.com",
      "billing@store.com",
      "staff@store.com",
      "demo@store.com",
    ].forEach((email) => {
      assert.ok(emails.has(email), `Expected demo login for ${email}`);
    });

    assert.ok(ROLE_PERMISSIONS.super_admin.includes("*"));
  });
});
