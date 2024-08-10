import { env } from "@/env";
import S3 from "aws-sdk/clients/s3";

const accountId = env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = env.CLOUDFLARE_R2_ID;
const accessKeySecret = env.CLOUDFLARE_R2_SECRET;
const bucketName = env.CLOUDFLARE_R2_BUCKET;

const s3 = new S3({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  accessKeyId: accessKeyId,
  secretAccessKey: accessKeySecret,
  signatureVersion: "v4",
});

export const createPresignedUrl = async ({
  key,
  contentType,
  expires = 5 * 60, // 5 minutes
}: {
  key: string;
  contentType: string;
  expires?: number;
}) => {
  return s3.getSignedUrl("putObject", {
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    Expires: expires,
  });
};

export const doesObjectExists = async (key: string) => {
  try {
    await s3
      .headObject({
        Bucket: bucketName,
        Key: key,
      })
      .promise();
    return true;
  } catch (e: any) {
    if (e.code === "NotFound" || e.statusCode === 404) {
      return false; // File does not exist
    } else {
      throw e; // Other errors (e.g., permission issues)
    }
  }
};
