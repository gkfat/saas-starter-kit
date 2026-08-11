import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (client) return client;

  const config = useRuntimeConfig();
  const accountId = config.r2AccountId as string;
  const accessKeyId = config.r2AccessKeyId as string;
  const secretAccessKey = config.r2SecretAccessKey as string;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY are all required.',
    );
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getBucketName(): string {
  const bucket = useRuntimeConfig().r2BucketName as string;
  if (!bucket) {
    throw new Error('Missing R2 env var: R2_BUCKET_NAME is required.');
  }
  return bucket;
}

function getPublicBaseUrl(): string {
  const baseUrl = useRuntimeConfig().r2PublicBaseUrl as string;
  if (!baseUrl) {
    throw new Error('Missing R2 env var: R2_PUBLIC_BASE_URL is required.');
  }
  return baseUrl;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${getPublicBaseUrl()}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}

// bannerUrl is stored as `${R2_PUBLIC_BASE_URL}/${key}` — strip the base URL to recover
// the object key needed for DeleteObjectCommand.
export function publicUrlToKey(publicUrl: string): string {
  const baseUrl = getPublicBaseUrl();
  return publicUrl.startsWith(`${baseUrl}/`) ? publicUrl.slice(baseUrl.length + 1) : publicUrl;
}
