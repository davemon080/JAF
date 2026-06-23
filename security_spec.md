# Security Specification: JAF Firestore Rules

This document outlines the zero-trust data invariants, security policies, and attack vectors validated against the Cloud Firestore security rules.

## 1. Data Invariants

1. **User Identity Isolation**: A user can only access or modify their own user profile document. Profile data (including delivery details) is keyed by their verified, lowercased email pointer.
2. **Admin Privilege Enforcement**: Storefront configuration, products, delivery zoning, ads, and coupons can only be created, modified, or deleted by verified administrative accounts (specifically `adminjaf@gmail.com` or any user marked with user record role `admin`).
3. **Immutable Order Records**: Customer checkout orders are immutable once placed except for operational state transitions (such as status updates, assignee assignments) which can only be executed by verified admins.
4. **Validation-First Schema**: Every entity created must confirm exactly to its JSON model specs under `firebase-blueprint.json` to prevent malicious data injection, Denial-of-Wallet resource bloat, or orphan references.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following attack payloads attempt to violate security boundaries and must be rejected with `PERMISSION_DENIED`.

1. **User Identity Spoofing**: An authenticated user `attacker@gmail.com` attempts to write info into `users/victim@gmail.com`.
2. **Admin Role Self-Assignment**: A newly registered user `user@gmail.com` passes a payload with `role: "admin"` to secure administrative credentials and pages.
3. **Unauthorized Storefront Modification**: An unauthenticated user attempts to update pricing for a high-end designer tee in `/products/tee-1`.
4. **Coupon Rate Poisoning**: An unauthenticated attacker attempts to inject a custom coupon to `/coupons/FREE100` setting the percent discount to `100`.
5. **Junk ID Poisoning**: A script attempts to create a product using a 2MB non-alphanumeric base64 string as the document ID path parameter.
6. **Immutable Field Tampering**: A client attempts to change the `createdAt` timestamp of an existing order or user record.
7. **Order Status Hijacking**: A customer attempts to manually flip their placed order's `status` to `delivered` or change their tracking reference block.
8. **PII Information Harvesting**: An authenticated visitor attempts to execute a blanket list query or get request against the `users` private collection to harvest other customers' emails and phones.
9. **Private Message Snoop**: An unauthorized client attempts to query or read contact forms in `/messages/{messageId}` submitted by other visitors.
10. **System Traffic Event Injection**: A crawler attempts to inject a traffic log record containing excessive payloads or scripts.
11. **Ad Manipulation**: A malicious actor attempts to update the active banner carousel in `ads/ad1` with dangerous links.
12. **Out-of-Bound Pricing Injection**: A request attempts to create a product containing negative prices.

---

## 3. The Test Runner Spec (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "justafriend-5bdb3",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

test("enforces zero-trust isolation on users and settings", async () => {
  const aliceDb = testEnv.authenticatedContext("alice_uid", {
    email: "alice@gmail.com",
    email_verified: true,
  }).firestore();

  // Alice can write her own document
  await assertSucceeds(
    aliceDb.collection("users").doc("alice@gmail.com").set({
      uid: "alice_uid",
      email: "alice@gmail.com",
      fullName: "Alice Doe",
      password: "pass",
      role: "user",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    })
  );

  // Alice cannot write Bob's document (Identity Spoofing)
  await assertFails(
    aliceDb.collection("users").doc("bob@gmail.com").set({
      uid: "alice_uid",
      email: "bob@gmail.com",
      fullName: "Bob Spoofed",
      password: "pass",
      role: "user",
    })
  );
});
```
