import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = process.env.SUPABASE_AVATARS_BUCKET || 'imagenes';
const PROJECT_REF = 'bkovvacsoijphppivkwp';

function getClient(): S3Client {
  return new S3Client({
    region: 'us-east-1',
    endpoint: `https://${PROJECT_REF}.storage.supabase.co/storage/v1/s3`,
    credentials: {
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

export async function uploadAvatar(buffer: Buffer, mimetype: string): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `avatars/${uuidv4()}.${ext}`;

  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));

  return `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/${key}`;
}
