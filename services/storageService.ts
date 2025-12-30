import { supabase } from "./supabaseClient";

/**
 * Storage service for uploading files to Supabase Storage
 */

// Bucket names
const OFFER_ATTACHMENTS_BUCKET = "offer-attachments";
const REQUEST_ATTACHMENTS_BUCKET = "request-attachments";

/**
 * Generates a unique file name for storage
 */
const generateFileName = (file: File, prefix: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'file';
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
};

/**
 * Uploads a file to Supabase Storage
 */
export const uploadFile = async (
  file: File,
  bucket: string,
  prefix: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const filePath = generateFileName(file, prefix);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path
    };
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
};

/**
 * Uploads multiple files for an offer
 */
export const uploadOfferAttachments = async (
  files: File[],
  offerId: string
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
  requestId: string
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const result = await uploadFile(file, REQUEST_ATTACHMENTS_BUCKET, requestId);
    if (result) {
      uploadedUrls.push(result.url);
    }
  }

  return uploadedUrls;
};

/**
 * Deletes a file from storage
 */
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete failed:', err);
    return false;
  }
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file types
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `الملف كبير جداً. الحد الأقصى ${formatFileSize(MAX_FILE_SIZE)}` };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'نوع الملف غير مدعوم' };
  }

  return { valid: true };
};



