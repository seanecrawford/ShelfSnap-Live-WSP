// utils/supabaseStorage.js
import { supabase } from './supabaseClient';

// Configuration
const BUCKET_NAME = 'shelf-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_QUALITY = 0.9; // For compression if needed

/**
 * Validates an image file before upload
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails
 */
export const validateImageFile = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    throw new Error(`File size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
  }

  return true;
};

/**
 * Sanitizes a filename for storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFileName = (filename) => {
  // Remove path components
  const baseName = filename.split('/').pop().split('\\').pop();
  
  // Replace non-alphanumeric characters except dots and hyphens
  const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Ensure it doesn't start with a dot
  return sanitized.startsWith('.') ? `file${sanitized}` : sanitized;
};

/**
 * Generates a unique storage path for a file
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {string} filename - Original filename
 * @param {string} category - Optional category (e.g., 'scans', 'planograms')
 * @returns {string} - Storage path
 */
export const generateStoragePath = (userId, storeId, filename, category = 'scans') => {
  const timestamp = Date.now();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const sanitizedFileName = sanitizeFileName(filename);
  
  // Organize by user/store/year/month/day for better structure
  return `${userId}/${storeId}/${category}/${year}/${month}/${day}/${timestamp}_${sanitizedFileName}`;
};

/**
 * Compresses an image file if needed
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImage = async (file, maxWidth = 2048, maxHeight = 2048) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          IMAGE_QUALITY
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a shelf image to Supabase storage
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with path and URL
 */
export const uploadShelfImage = async (file, userId, storeId, options = {}) => {
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    if (!storeId) throw new Error('Store ID is required');
    
    // Validate file
    validateImageFile(file);
    
    // Compress if needed
    let uploadFile = file;
    if (options.compress !== false && file.size > 2 * 1024 * 1024) {
      // Compress if larger than 2MB
      const compressed = await compressImage(file);
      uploadFile = new File([compressed], file.name, { type: file.type });
      console.log(`Compressed image from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Generate storage path
    const filePath = generateStoragePath(
      userId, 
      storeId, 
      file.name, 
      options.category || 'scans'
    );
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, uploadFile, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
        contentType: file.type
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      
      // Handle specific errors
      if (error.message?.includes('already exists')) {
        throw new Error('An image with this name already exists. Please rename the file.');
      } else if (error.message?.includes('quota')) {
        throw new Error('Storage quota exceeded. Please contact support.');
      } else if (error.statusCode === 413) {
        throw new Error('File too large. Please use a smaller image.');
      }
      
      throw new Error(error.message || 'Failed to upload image');
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    const result = {
      path: filePath,
      url: urlData.publicUrl,
      size: uploadFile.size,
      type: uploadFile.type,
      timestamp: Date.now(),
      originalName: file.name,
      bucket: BUCKET_NAME
    };
    
    console.log('Upload successful:', result);
    return result;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Downloads a shelf image from Supabase storage
 * @param {string} filePath - Storage path of the file
 * @returns {Promise<Blob>} - Image blob
 */
export const downloadShelfImage = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);
    
    if (error) {
      console.error('Download error:', error);
      throw new Error(error.message || 'Failed to download image');
    }
    
    return data;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

/**
 * Deletes a shelf image from Supabase storage
 * @param {string} filePath - Storage path of the file
 * @returns {Promise<boolean>} - True if successful
 */
export const deleteShelfImage = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete image');
    }
    
    console.log('Successfully deleted:', filePath);
    return true;
    
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

/**
 * Batch delete multiple images
 * @param {string[]} filePaths - Array of storage paths
 * @returns {Promise<Object>} - Result object with successes and failures
 */
export const batchDeleteImages = async (filePaths) => {
  const results = {
    succeeded: [],
    failed: []
  };
  
  for (const path of filePaths) {
    try {
      await deleteShelfImage(path);
      results.succeeded.push(path);
    } catch (error) {
      results.failed.push({ path, error: error.message });
    }
  }
  
  return results;
};

/**
 * Gets a signed URL for temporary access to a private file
 * @param {string} filePath - Storage path of the file
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Signed URL error:', error);
      throw new Error(error.message || 'Failed to create signed URL');
    }
    
    return data.signedUrl;
    
  } catch (error) {
    console.error('Signed URL error:', error);
    throw error;
  }
};

/**
 * Lists all images for a specific store
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {Object} options - List options
 * @returns {Promise<Array>} - Array of file objects
 */
export const listStoreImages = async (userId, storeId, options = {}) => {
  try {
    const path = `${userId}/${storeId}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: {
          column: options.sortBy || 'created_at',
          order: options.sortOrder || 'desc'
        }
      });
    
    if (error) {
      console.error('List error:', error);
      throw new Error(error.message || 'Failed to list images');
    }
    
    // Add full URLs to each file
    const filesWithUrls = data.map(file => {
      const fullPath = `${path}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fullPath);
      
      return {
        ...file,
        path: fullPath,
        url: urlData.publicUrl
      };
    });
    
    return filesWithUrls;
    
  } catch (error) {
    console.error('List error:', error);
    throw error;
  }
};

/**
 * Moves/renames a file in storage
 * @param {string} fromPath - Current path
 * @param {string} toPath - New path
 * @returns {Promise<boolean>} - True if successful
 */
export const moveShelfImage = async (fromPath, toPath) => {
  try {
    // Download the file
    const blob = await downloadShelfImage(fromPath);
    
    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(toPath, blob, {
        contentType: blob.type || 'image/jpeg'
      });
    
    if (uploadError) throw uploadError;
    
    // Delete from old location
    await deleteShelfImage(fromPath);
    
    console.log(`Successfully moved ${fromPath} to ${toPath}`);
    return true;
    
  } catch (error) {
    console.error('Move error:', error);
    throw new Error(`Failed to move file: ${error.message}`);
  }
};

/**
 * Gets storage usage statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Usage statistics
 */
export const getStorageStats = async (userId) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 1000
      });
    
    if (error) throw error;
    
    let totalSize = 0;
    let fileCount = 0;
    const fileTypes = {};
    
    // Recursive function to get all files
    const getAllFiles = async (path = userId) => {
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path);
      
      for (const item of files || []) {
        if (item.metadata) {
          totalSize += item.metadata.size || 0;
          fileCount++;
          
          const ext = item.name.split('.').pop().toLowerCase();
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        }
        
        // If it's a directory, recurse
        if (!item.metadata && item.name) {
          await getAllFiles(`${path}/${item.name}`);
        }
      }
    };
    
    await getAllFiles();
    
    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      fileCount,
      fileTypes,
      averageSize: fileCount > 0 ? totalSize / fileCount : 0,
      averageSizeMB: fileCount > 0 ? ((totalSize / fileCount) / (1024 * 1024)).toFixed(2) : '0'
    };
    
  } catch (error) {
    console.error('Stats error:', error);
    throw error;
  }
};

// Export all functions
export default {
  validateImageFile,
  sanitizeFileName,
  generateStoragePath,
  compressImage,
  uploadShelfImage,
  downloadShelfImage,
  deleteShelfImage,
  batchDeleteImages,
  getSignedUrl,
  listStoreImages,
  moveShelfImage,
  getStorageStats,
  BUCKET_NAME,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES
};
