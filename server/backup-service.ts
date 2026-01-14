import { storage } from "./storage";
import { objectStorageClient } from "./replit_integrations/object_storage";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
        "tool and set PRIVATE_OBJECT_DIR env var."
    );
  }
  return dir;
}

export interface BackupResult {
  success: boolean;
  backupId?: number;
  objectPath?: string;
  fileSize?: number;
  error?: string;
}

export async function createBackupToObjectStorage(
  createdBy: number | null,
  isAutomatic: boolean = false
): Promise<BackupResult> {
  try {
    const backupData = await storage.createFullBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileSize = Buffer.byteLength(jsonString, 'utf-8');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = randomUUID();
    const backupName = isAutomatic 
      ? `نسخة تلقائية - ${timestamp}` 
      : `نسخة يدوية - ${timestamp}`;
    
    const privateDir = getPrivateObjectDir();
    const objectPath = `${privateDir}/backups/backup-${timestamp}-${backupId}.json`;
    
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(jsonString, {
      contentType: 'application/json',
      metadata: {
        backupType: isAutomatic ? 'automatic' : 'manual',
        createdAt: new Date().toISOString(),
      },
    });
    
    const backup = await storage.createBackup({
      name: backupName,
      objectPath: objectPath,
      fileSize: fileSize,
      createdBy: createdBy,
      isAutomatic: isAutomatic,
    });
    
    return {
      success: true,
      backupId: backup.id,
      objectPath: objectPath,
      fileSize: fileSize,
    };
  } catch (error) {
    console.error("Failed to create backup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getBackupDownloadUrl(objectPath: string): Promise<string> {
  const { bucketName, objectName } = parseObjectPath(objectPath);
  return signObjectURL({
    bucketName,
    objectName,
    method: "GET",
    ttlSec: 3600,
  });
}

export async function deleteBackupFromObjectStorage(objectPath: string): Promise<boolean> {
  try {
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.delete();
    return true;
  } catch (error) {
    console.error("Failed to delete backup from object storage:", error);
    return false;
  }
}
