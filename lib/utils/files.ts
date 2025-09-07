import { join } from 'path';
import { deleteFromS3, deriveThumbKey } from '@/lib/s3';

/**
 * Utilities for file operations
 */
export class FileOperationUtils {
  /**
   * Safely deletes a file based on its path (S3 or local filesystem)
   * For S3 files, also deletes associated thumbnails
   */
  static async deleteFile(filePath: string | null): Promise<void> {
    if (!filePath) return;

    try {
      if (filePath.startsWith('s3:')) {
        const key = filePath.replace(/^s3:/, '');
        
        // Delete main file and thumbnails concurrently
        const deletePromises = [
          deleteFromS3(key),
          deleteFromS3(deriveThumbKey(key, 'sm')).catch(() => {}),
          deleteFromS3(deriveThumbKey(key, 'md')).catch(() => {}),
        ];
        
        await Promise.allSettled(deletePromises);
      } else {
        // Local file deletion
        const fs = require('fs').promises;
        const fullPath = join(process.cwd(), 'public', filePath);
        await fs.unlink(fullPath);
      }
    } catch (error) {
      // Log error but don't throw - file might already be deleted
      console.error('Error deleting file:', error);
    }
  }

  /**
   * Safely deletes multiple files concurrently
   */
  static async deleteFiles(filePaths: (string | null)[]): Promise<void> {
    await Promise.allSettled(
      filePaths.map(filePath => this.deleteFile(filePath))
    );
  }

  /**
   * Validates file type for photo uploads
   */
  static validatePhotoFile(file: File, maxSizeBytes: number): void {
    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`);
    }

    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      throw new Error(
        `File too large: ${fileSizeMB}MB. Maximum allowed size: ${maxSizeMB}MB.`
      );
    }
  }

  /**
   * Validates multiple files for photo uploads
   */
  static validatePhotoFiles(files: File[], maxSizeBytes: number): File[] {
    const validFiles: File[] = [];
    
    for (const file of files) {
      try {
        this.validatePhotoFile(file, maxSizeBytes);
        validFiles.push(file);
      } catch (error) {
        console.warn(`Skipping invalid file ${file.name}: ${error}`);
      }
    }

    if (validFiles.length === 0) {
      throw new Error('No valid image files found');
    }

    return validFiles;
  }
}