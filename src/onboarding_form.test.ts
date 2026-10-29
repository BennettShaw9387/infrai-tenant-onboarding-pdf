import test from "node:test";
import assert from "node:assert/strict";
import { decideOnboarding } from "./onboarding_form.ts";

test("tenant onboarding moves to review and invites its first account", () => {
  const result = decideOnboarding({ tenantId: "northwind", tenantName: "Northwind", adminEmail: "admin@northwind.example", accountEmail: "owner@northwind.example" });
  assert.equal(result.state, "pending_review");
  assert.equal(result.accountState, "invited");
  assert.equal(result.fields.admin_email, "admin@northwind.example");
  assert.equal(result.fields.lifecycle_state, "pending_review");
});
