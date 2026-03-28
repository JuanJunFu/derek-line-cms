import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "derek-images";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://img.drweber.uk

/** Whether R2 is properly configured */
const R2_ENABLED = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);

const s3 = R2_ENABLED
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/**
 * Upload a file. Uses Cloudflare R2 if configured, otherwise falls back to local storage.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (R2_ENABLED && s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // Fallback: save to public/uploads/
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, key);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`[upload] Local fallback: saved to public/uploads/${key}`);
  return `/uploads/${key}`;
}

/**
 * Delete a file. Uses R2 if configured, otherwise deletes from local storage.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (R2_ENABLED && s3) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return;
  }

  // Fallback: delete from public/uploads/
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[upload] Local fallback: deleted public/uploads/${key}`);
  }
}
