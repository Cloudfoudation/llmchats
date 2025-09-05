// src/services/download/S3Download.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fetchAuthSession } from 'aws-amplify/auth';

export class S3Download {
    private s3Client: S3Client | null = null;
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const session = await fetchAuthSession();
            if (!session.credentials) {
                throw new Error('No valid credentials found');
            }

            this.s3Client = new S3Client({
                credentials: session.credentials,
                region: process.env.NEXT_PUBLIC_AWS_REGION,
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize S3Download:', error);
            throw error;
        }
    }

    async downloadFile(s3Location: string): Promise<Blob> {
        if (!this.initialized || !this.s3Client) {
            await this.initialize();
        }

        try {
            // Parse S3 URL to get bucket and key
            let bucket, key;

            // Handle different S3 location formats
            if (s3Location.startsWith('s3://')) {
                // Format: s3://bucket/key
                const parts = s3Location.substring(5).split('/', 1);
                bucket = parts[0];
                key = s3Location.substring(5 + bucket.length + 1);
            } else {
                // Assume format: https://bucket.s3.region.amazonaws.com/key
                const url = new URL(s3Location);
                bucket = url.hostname.split('.')[0];
                key = url.pathname.slice(1);
            }

            if (!bucket || !key) {
                throw new Error(`Invalid S3 location format: ${s3Location}`);
            }

            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });

            const response = await this.s3Client!.send(command);

            if (!response.Body) {
                throw new Error('No file content received');
            }

            // Convert stream to blob
            const stream = response.Body as ReadableStream;
            const blob = await new Response(stream).blob();
            return blob;
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }
}

export const s3Download = new S3Download();