/**
 * Cloudflare R2 helpers.
 *
 * R2 is S3-compatible — use the AWS SDK v3 S3Client with the R2 endpoint.
 * For production, bind R2 buckets directly to the Worker for zero-egress
 * access (no AWS SDK needed); use this S3 path for local dev / parity.
 */
export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function getR2Config(env: Record<string, string | undefined> = import.meta.env as any): R2Config {
  return {
    accountId: env.R2_ACCOUNT_ID ?? "",
    accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: env.R2_BUCKET_SUBMISSIONS ?? "readmoresff-submissions",
  };
}

/**
 * Returns the S3-compatible endpoint URL for R2.
 */
export function r2Endpoint(cfg: R2Config): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com`;
}

// TODO: when wiring up real uploads, switch to direct R2 binding via wrangler.toml:
//   [[r2_buckets]]
//   binding = "SUBMISSIONS"
//   bucket_name = "readmoresff-submissions"
// Then in handlers:
//   await env.SUBMISSIONS.put(key, file.stream())
