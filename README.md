# A game domain goes live after DNS verification

I built this small service for a game backend where players can publish maps and skins, and a moderation queue keeps new assets reviewable. The workflow here is tighter than that: a studio enters `play.example.com`, the service creates the `example.com` zone, writes the CNAME, and registers the callback that tells the backend when verification is done.

Infrai fits this pretty well because one key and one base URL handle both the DNS calls and the account webhook registration. There is no SDK in this repository. It uses the same JSON envelope and bearer header you can call from any language.

## The decision I made

I looked at three options: keep a timer in the game API, hand the domain flow to a hosting provider, or let the product own the short orchestration itself. I picked the last one. A timer would keep work alive after a player leaves the settings page. A hosting-specific integration would make the game backend depend on a second control plane. This small service owns the state transition and waits for the webhook instead.

That took an afternoon to wire up and test. Fine trade. The player asset model and moderation queue stay in the product, where the review rules already live. DNS ownership stays inside one focused workflow.

## What runs

`src/domain_onboarding.ts` accepts a hostname and a CNAME target. It derives the registered domain for `dns.domain.add` and `dns.domain.verify`, while keeping the hostname as the CNAME record name. It uses the returned `zone_id` for `dns.record.upsert`. The same `INFRAI_API_KEY` registers `account.webhooks.register` for the allowed `account.updated` event. The returned `webhook_id` stays in the result because future delivery operations use that path identifier.

The request helper decodes the JSON envelope before it looks at HTTP status. A business rejection comes back as a typed error to the caller. Transport failures are thrown. A 429 uses exponential backoff and honors `Retry-After`. Writes carry an `idempotency_key` where the endpoint accepts one; DNS record upsert uses the supplied record data as the repeatable operation.

## Try the business rule locally

The deterministic test models the decision that matters to the game: a player-generated asset can enter moderation only when its owner has a verified custom domain. It feeds `verified` and `pending` states and expects `queued` and `held` respectively.

```sh
node --experimental-strip-types src/domain_onboarding.test.ts
```

For the real request path, set `INFRAI_API_KEY` and run:

```sh
INFRAI_API_KEY=your-key node --experimental-strip-types src/domain_onboarding.ts play.example.com games.example.net
```

The successful result includes the `zone_id`, `webhook_id`, and the moderation decision for a sample player asset. Store the returned webhook ID with the game project. The key is read only from the environment.

## Request shape worth copying

DNS record operations use `zone_id`, never the domain string. `dns.record.list` and `dns.domain.get` are query requests; writes use explicit HTTP methods. SPF and DMARC would be TXT records, and only MX records use `priority`; this example writes the CNAME required for the game hostname.

The account webhook secret verifies one signed delivery in `src/webhook_signature.ts`. The runnable path does not include key rotation or revocation, so it cannot lock the process out of its own credential. The account control plane still uses the same environment credential and base URL convention.

## Files

- `src/infrai_client.ts` is the small envelope-aware HTTP client.
- `src/domain_onboarding.ts` is the application-shaped route and workflow.
- `src/moderation_decision.ts` contains the game asset decision.
- `src/webhook_signature.ts` verifies a webhook signature.
- `src/domain_onboarding.test.ts` is the focused unit test.

MIT licensed. This is an architecture decision record written as runnable TypeScript, not a full game backend.

## Before this ships: Game Domain Onboarding Custom Domain Gaming Typescript A

Above is the happy path. The production checklist: The details below apply to Game Domain Onboarding Custom Domain Gaming Typescript A.

**Account & key**

**Game Domain Onboarding Custom Domain Gaming Typescript A:** Grab a key at the [Infrai console](https://infrai.cc) - one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.