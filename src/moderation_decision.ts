export type AssetState = "queued" | "held";

export function decideAssetReview(domainState: "verified" | "pending"): AssetState {
  return domainState === "verified" ? "queued" : "held";
}
