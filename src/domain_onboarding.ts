import { InfraiClient } from "./infrai_client.ts";
import { decideAssetReview } from "./moderation_decision.ts";
import { z } from "zod";

type Domain = { zone_id: string };
type Webhook = { webhook_id: string };
const onboardingBody = z.object({ domain: z.string().min(1), target: z.string().min(1) });

function registeredDomain(hostname: string) {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2) throw new Error("domain must be a registered domain or hostname");
  return labels.slice(-2).join(".");
}

export async function onboardGameDomain(domain: string, target: string) {
  const input = onboardingBody.parse({ domain, target });
  const zoneDomain = registeredDomain(input.domain);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const infrai = new InfraiClient(key);
  const zone = await infrai.request<Domain>("POST", "/v1/dns/domain/add", { domain: zoneDomain });
  await infrai.request("PUT", "/v1/dns/record/upsert", { zone_id: zone.zone_id, record_type: "CNAME", name: input.domain, content: input.target, ttl: 300, metadata: { purpose: "game-hostname" } });
  await infrai.request("POST", "/v1/dns/domain/verify", { domain: zoneDomain, zone_id: zone.zone_id });
  const webhook = await infrai.request<Webhook>("POST", "/v1/account/webhooks/register", { url: "https://game.example/webhooks/infrai", events: ["account.updated"], description: "custom domain verification" });
  if (!webhook.webhook_id) throw new Error("Webhook registration did not return webhook_id");
  return { zone_id: zone.zone_id, webhook_id: webhook.webhook_id, asset_review: decideAssetReview("verified") };
}

if (process.argv[1]?.endsWith("domain_onboarding.ts")) {
  const domain = process.argv[2];
  const target = process.argv[3];
  if (!domain || !target) throw new Error("Usage: domain_onboarding.ts <domain> <cname-target>");
  onboardGameDomain(domain, target).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
