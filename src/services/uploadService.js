const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Configure Cloudinary
if (config.upload.provider === 'cloudinary') {
  cloudinary.config({
    cloud_name: config.upload.cloudinary.cloudName,
    api_key: config.upload.cloudinary.apiKey,
    api_secret: config.upload.cloudinary.apiSecret,
  });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = req.uploadFolder || 'misc';
    const uploadPath = path.join(config.upload.local.uploadDir, folder);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...config.upload.allowedTypes.images,
    ...config.upload.allowedTypes.documents,
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
  },
});

/**
 * Upload single file
 */
const uploadSingle = (fieldName, folder = 'misc') => {
  return (req, res, next) => {
    req.uploadFolder = folder;
    upload.single(fieldName)(req, res, next);
  };
};

/**
 * Upload multiple files
 */
const uploadMultiple = (fieldName, maxCount = 5, folder = 'misc') => {
  return (req, res, next) => {
    req.uploadFolder = folder;
    upload.array(fieldName, maxCount)(req, res, next);
  };
};

/**
 * Process and upload image
 */
const processAndUpload = async (file, options = {}) => {
  const {
    folder = 'misc',
    width = null,
    height = null,
    quality = 80,
    format = 'jpeg',
  } = options;

  try {
    // Process image with sharp
    let sharpInstance = sharp(file.path);

    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const processedPath = `${file.path}-processed.${format}`;
    await sharpInstance[format]({ quality }).toFile(processedPath);

    // Upload based on provider
    if (config.upload.provider === 'cloudinary') {
      const result = await cloudinary.uploader.upload(processedPath, {
        folder: `pg-nexus/${folder}`,
        resource_type: 'auto',
      });

      // Clean up temp files
      await fs.unlink(file.path);
      await fs.unlink(processedPath);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } else {
      // Local storage
      const filename = path.basename(processedPath);
      const relativePath = path.join(folder, filename);
      const publicUrl = `/uploads/${relativePath}`;

      // Move processed file to final location
      await fs.rename(processedPath, path.join(config.upload.local.uploadDir, relativePath));

      // Clean up original temp file
      await fs.unlink(file.path);

      return {
        url: publicUrl,
        publicId: relativePath,
      };
    }
  } catch (error) {
    // Clean up on error
    try {
      await fs.unlink(file.path);
    } catch (err) {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Upload file without processing
 */
const uploadFile = async (file, folder = 'documents') => {
  try {
    if (config.upload.provider === 'cloudinary') {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `pg-nexus/${folder}`,
        resource_type: 'auto',
      });

      await fs.unlink(file.path);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } else {
      // Local storage
      const filename = path.basename(file.path);
      const relativePath = path.join(folder, filename);
      const publicUrl = `/uploads/${relativePath}`;

      return {
        url: publicUrl,
        publicId: relativePath,
      };
    }
  } catch (error) {
    try {
      await fs.unlink(file.path);
    } catch (err) {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Delete file
 */
const deleteFile = async (publicId) => {
  try {
    if (config.upload.provider === 'cloudinary') {
      await cloudinary.uploader.destroy(publicId);
    } else {
      // Local storage
      const filePath = path.join(config.upload.local.uploadDir, publicId);
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error, file might already be deleted
  }
};

/**
 * Delete multiple files
 */
const deleteFiles = async (publicIds) => {
  const promises = publicIds.map((id) => deleteFile(id));
  await Promise.allSettled(promises);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  processAndUpload,
  uploadFile,
  deleteFile,
  deleteFiles,
};
