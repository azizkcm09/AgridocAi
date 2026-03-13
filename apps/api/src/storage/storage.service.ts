import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;

  constructor() {
    const region = process.env.S3_REGION;
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 configuration is incomplete');
    }

    this.s3Client = new S3Client({
      region,                    
      endpoint,                  
      credentials: { accessKeyId, secretAccessKey }, 
      forcePathStyle: true,
    });
  }
async getPresignedUploadUrl(fileName: string, contentType: string) {
    // 1. Create a unique file name to prevent overwriting
    const uniqueFileName = `documents/${Date.now()}-${fileName}`;

    // 2. Define the command for S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    // 3. Generate the URL (Expires in 5 minutes / 300 seconds)
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    // 4. Return both the URL and the final file path (Key)
    return {
      uploadUrl,
      key: uniqueFileName,
    };
  }

  // Generate a presigned GET URL so the browser can view/download the file directly from MinIO.
  // Expires in 15 minutes — enough for a review session.
  async getPresignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    return { downloadUrl };
  }
}

