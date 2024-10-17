import { env } from "@/env";
import { _Object, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3({
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET,
  },
  region: "auto",
});

const bucketName = env.CLOUDFLARE_R2_BUCKET;

export const createPresignedUrl = async ({
  key,
  contentType,
  expires = 5 * 60, // 5 minutes
}: {
  key: string;
  contentType: string;
  expires?: number;
}) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, {
    ...(expires ? { expiresIn: expires } : {}),
  });
};

export const doesObjectExists = async (key: string) => {
  try {
    await s3.headObject({
      Bucket: bucketName,
      Key: key,
    });
    return true;
  } catch (e: any) {
    if (e.code === "NotFound" || e.$metadata.httpStatusCode === 404) {
      return false; // File does not exist
    } else {
      throw e; // Other errors (e.g., permission issues)
    }
  }
};
