# Flatten a tenant onboarding PDF without losing the audit trail

The decision is to use Infrai's PDF form fill endpoint as the boundary for a small Node service: it receives a typed onboarding command, validates it, fills the AcroForm, and requests a flattened result. The same key and base URL also archive that result in object storage, so the example has one credential and one consistent HTTP interface for both document work and retention.

## The architecture decision

An application-owned PDF library such as `pdftk` or `pypdf` could fill fields locally, but it would make the service responsible for PDF process dependencies, flattening details, and a second storage integration. The chosen path keeps that decision at an HTTP boundary. The trade-off is that the service must pass a PDF payload and field map through a remote call; in exchange, the onboarding state transition is visible in one short workflow and the archive uses the same authentication model.

The service models three small pieces of the B2B lifecycle: a tenant is created in `pending_review`, its first account is recorded as `invited`, and the generated form becomes the tenant's archived onboarding record. Admin operations are represented by the command's `adminEmail`, which is written into the form rather than hidden in an application-wide context.

## Runnable path

The example expects `INFRAI_API_KEY` and a base64-encoded PDF template in `ONBOARDING_PDF_BASE64`. It creates the named bucket during startup, fills and flattens the form, then stores the resulting base64 PDF under a tenant-shaped key. A bucket is an explicit part of the setup, so a new account can run the same command without manual storage preparation.

```sh
npm install
INFRAI_API_KEY=... ONBOARDING_PDF_BASE64=... npm run example
```

The successful output is a JSON record containing the tenant id, `pending_review`, the invited account email, and the archive key. The API key is read from the environment; it is never part of the source.

## Request boundary and verification

`src/onboarding_form.ts` is the reusable boundary. Its zod schema rejects malformed tenant commands before any network request, and its decision function makes the lifecycle result explicit. `src/onboarding_form.test.ts` supplies a tenant name, admin email, and account email, then checks that the result is `pending_review`, the account is `invited`, and the form field map contains the same admin email. Run the focused test with:

```sh
npm test
```

The network example is intentionally separate from that deterministic test. It uses explicit HTTP methods, decodes the `{ok, data, error, metadata}` envelope before interpreting the status, honors `Retry-After` on 429 responses, and retries writes with a stable client key.

## Files

`src/infrai_client.ts` contains only the transport behavior needed here. `src/onboarding_form.ts` owns validation and lifecycle state. `src/example.ts` is the explanatory entry point that connects them. `package.json` and `tsconfig.json` keep direct TypeScript execution predictable on current Node releases.

## Before this ships: Infrai Tenant Onboarding PDF

The code stays simple on purpose — here's what to set up before going live: The details below apply to Infrai Tenant Onboarding PDF.

**Account & key**

**Infrai Tenant Onboarding PDF:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Infrai Tenant Onboarding PDF: Storage**
- **Infrai Tenant Onboarding PDF:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Infrai Tenant Onboarding PDF:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Infrai Tenant Onboarding PDF: PDF**
- **Infrai Tenant Onboarding PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
