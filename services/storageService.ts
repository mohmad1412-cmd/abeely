import { supabase } from "./supabaseClient";
import { logger } from "../utils/logger";

/**
 * Storage service for uploading files to Supabase Storage
 */

// Bucket names
const OFFER_ATTACHMENTS_BUCKET = "offer-attachments";
const REQUEST_ATTACHMENTS_BUCKET = "request-attachments";
const AVATARS_BUCKET = "avatars";

/**
 * Generates a unique file name for storage
 */
const generateFileName = (file: File, prefix: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split(".").pop() || "file";
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
};

/**
 * Uploads a file to Supabase Storage
 */
export const uploadFile = async (
  file: File,
  bucket: string,
  prefix: string,
): Promise<{ url: string; path: string } | null> => {
  try {
    const filePath = generateFileName(file, prefix);
    
    logger.log(`Uploading file: ${file.name} to ${bucket}/${filePath}`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket,
      path: filePath,
    }, "storage");

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      logger.error("Upload error:", {
        error,
        message: error.message,
        statusCode: error.statusCode,
        fileName: file.name,
        bucket,
        path: filePath,
      }, "storage");
      
      // Check if bucket doesn't exist
      if (error.message?.includes("Bucket not found") || error.message?.includes("not found")) {
        logger.error(`Storage bucket '${bucket}' does not exist. Please create it in Supabase Storage.`, undefined, "storage");
        throw new Error(`Storage bucket '${bucket}' غير موجود. يرجى إنشاؤه في Supabase Storage.`);
      }
      
      // Check for permission errors
      if (error.message?.includes("permission") || error.message?.includes("policy") || error.message?.includes("RLS")) {
        logger.error(`Permission denied for bucket '${bucket}'. Check RLS policies.`, {
          error: error.message,
        }, "storage");
        throw new Error(`ليس لديك صلاحية لرفع الملفات. يرجى التحقق من تسجيل الدخول.`);
      }
      
      return null;
    }

    if (!data) {
      logger.error("Upload returned no data", {
        fileName: file.name,
        bucket,
      }, "storage");
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    logger.log(`File uploaded successfully: ${file.name}`, {
      url: urlData.publicUrl,
      path: data.path,
    }, "storage");

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    logger.error("Upload failed:", {
      error: err,
      message: err?.message,
      fileName: file.name,
      bucket,
    }, "storage");
    return null;
  }
};

/**
 * Uploads multiple files for an offer
 */
export const uploadOfferAttachments = async (
  files: File[],
  offerId: string,
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const result = await uploadFile(file, OFFER_ATTACHMENTS_BUCKET, offerId);
    if (result) {
      uploadedUrls.push(result.url);
    }
  }

  return uploadedUrls;
};

/**
 * Uploads multiple files for a request
 */
export const uploadRequestAttachments = async (
  files: File[],
  requestId: string,
): Promise<string[]> => {
  if (!files || files.length === 0) {
    logger.log("No files to upload", { requestId }, "storage");
    return [];
  }

  logger.log(`Starting upload of ${files.length} file(s) for request: ${requestId}`, {
    requestId,
    fileCount: files.length,
    fileNames: files.map(f => f.name),
  }, "storage");

  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      logger.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }, "storage");

      // Validate file before upload
      const validation = validateFile(file);
      if (!validation.valid) {
        logger.warn(`File validation failed: ${validation.error}`, { 
          fileName: file.name,
          error: validation.error,
        }, "storage");
        continue;
      }

      const result = await uploadFile(
        file,
        REQUEST_ATTACHMENTS_BUCKET,
        requestId,
      );
      
      if (result && result.url) {
        uploadedUrls.push(result.url);
        logger.log(`✅ File ${i + 1}/${files.length} uploaded successfully: ${file.name}`, {
          url: result.url,
        }, "storage");
      } else {
        logger.warn(`❌ Failed to upload file: ${file.name} (no result returned)`, {
          fileName: file.name,
        }, "storage");
      }
    } catch (error: any) {
      logger.error(`❌ Error uploading file ${file.name}:`, {
        error,
        message: error?.message,
        fileName: file.name,
        requestId,
      }, "storage");
      // Continue with other files even if one fails
      // Don't throw - let the request continue without this file
    }
  }

  logger.log(`Upload complete: ${uploadedUrls.length}/${files.length} files uploaded successfully`, {
    requestId,
    uploadedCount: uploadedUrls.length,
    totalFiles: files.length,
    uploadedUrls,
  }, "storage");

  if (uploadedUrls.length === 0 && files.length > 0) {
    logger.warn("⚠️ No files were uploaded successfully", { 
      totalFiles: files.length,
      requestId,
    }, "storage");
  }

  return uploadedUrls;
};

/**
 * Deletes a file from storage
 */
export const deleteFile = async (
  bucket: string,
  path: string,
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      logger.error("Delete error", error, "storageService");
      return false;
    }

    return true;
  } catch (err) {
    logger.error("Delete failed", err as Error, "storageService");
    return false;
  }
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/");
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith("video/");
};

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file types
 */
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `الملف كبير جداً. الحد الأقصى ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "نوع الملف غير مدعوم" };
  }

  return { valid: true };
};

/**
 * Uploads user avatar image
 * Deletes old avatar if exists
 */
export const uploadAvatar = async (
  file: File,
  userId: string,
  oldAvatarUrl?: string | null,
): Promise<string | null> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      logger.error("Avatar validation failed", undefined, "storageService", {
        error: validation.error,
      });
      return null;
    }

    // Only allow images for avatars
    if (!isImageFile(file)) {
      logger.error("Avatar must be an image", undefined, "storageService");
      return null;
    }

    // Delete old avatar if exists
    if (oldAvatarUrl) {
      try {
        // Extract path from URL (remove domain and bucket prefix)
        const urlParts = oldAvatarUrl.split("/");
        const pathIndex = urlParts.findIndex((part) => part === AVATARS_BUCKET);
        if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
          const oldPath = urlParts.slice(pathIndex + 1).join("/");
          await deleteFile(AVATARS_BUCKET, oldPath);
        }
      } catch (err) {
        logger.warn("Failed to delete old avatar", err, "storageService");
        // Continue anyway
      }
    }

    // Upload new avatar
    const result = await uploadFile(file, AVATARS_BUCKET, userId);

    if (result) {
      return result.url;
    }

    return null;
  } catch (err) {
    logger.error("Avatar upload failed", err as Error, "storageService");
    return null;
  }
};
