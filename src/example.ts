import { InfraiClient } from "./infrai_client.ts";
import { decideOnboarding } from "./onboarding_form.ts";

const apiKey = process.env.INFRAI_API_KEY;
const template = process.env.ONBOARDING_PDF_BASE64;
if (!apiKey || !template) throw new Error("Set INFRAI_API_KEY and ONBOARDING_PDF_BASE64");

const decision = decideOnboarding({
  tenantId: "acme-eu",
  tenantName: "Acme Europe",
  adminEmail: "admin@acme.example",
  accountEmail: "owner@acme.example"
});
const client = new InfraiClient(apiKey);
const bucket = `tenant-${decision.command.tenantId}`;
const archiveKey = `onboarding/${decision.command.tenantId}/filled-form.pdf`;
await client.createBucket(bucket);
const filled = await client.fillForm(template, decision.fields, `fill:${decision.command.tenantId}`);
await client.archive(bucket, archiveKey, filled.data_base64);

console.log(JSON.stringify({ tenantId: decision.command.tenantId, state: decision.state, accountState: decision.accountState, archiveKey }, null, 2));
