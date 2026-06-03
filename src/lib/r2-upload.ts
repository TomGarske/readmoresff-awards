/**
 * Cloudflare R2 upload via the S3-compatible API.
 *
 * In production, prefer the Worker-native R2 binding (free egress, lower latency)
 * — see wrangler.toml. The S3 client here is used for local dev and any code
 * path that runs outside the Worker runtime.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config, r2Endpoint } from "./r2";

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const cfg = getR2Config();
  _client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(cfg),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return _client;
}

export async function putObject(key: string, body: ArrayBuffer | Uint8Array, contentType: string) {
  const cfg = getR2Config();
  await client().send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body as any,
    ContentType: contentType,
  }));
  return { bucket: cfg.bucket, key };
}

export async function getSignedDownloadUrl(key: string, expiresInSec = 60 * 60) {
  const cfg = getR2Config();
  return getSignedUrl(client(), new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  }), { expiresIn: expiresInSec });
}
