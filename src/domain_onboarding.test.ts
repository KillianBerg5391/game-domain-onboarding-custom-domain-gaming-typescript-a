import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { decideAssetReview } from "./moderation_decision.ts";
import { verifyWebhookSignature } from "./webhook_signature.ts";

assert.equal(decideAssetReview("verified"), "queued");
assert.equal(decideAssetReview("pending"), "held");
const payload = JSON.stringify({ event: "account.updated" });
const signature = createHmac("sha256", "test-secret").update(payload).digest("hex");
assert.equal(verifyWebhookSignature(payload, signature, "test-secret"), true);
console.log("domain decision: verified assets queue, pending assets hold");
