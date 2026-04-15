const cloudinary = require('cloudinary').v2;
const AppError = require('./appError');
const config = require('./config');
const logger = require('./logger');

const isConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);

if (!isConfigured) {
  logger.warn('Cloudinary credentials are missing');
}

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

exports.cloudinary = cloudinary;

exports.uploadImageToCloudinary = async (buffer, folder) => {
  if (!isConfigured) {
    throw new AppError('Image upload service is not configured', 500);
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
};

exports.deleteCloudinaryFile = async (imageUrl) => {
  try {
    if (!isConfigured || !imageUrl) return false;

    const match = imageUrl.match(/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match || !match[1]) return false;

    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return true;
  } catch (err) {
    logger.warn('Failed to delete Cloudinary file', { imageUrl, error: err });
    return false;
  }
};

exports.deleteCloudinaryFolder = async (folderPath) => {
  try {
    if (!isConfigured || !folderPath) return false;

    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 100,
    });

    for (const file of resources) {
      await cloudinary.uploader.destroy(file.public_id);
    }

    await cloudinary.api.delete_folder(folderPath);
    return true;
  } catch (err) {
    logger.warn('Cloudinary cleanup failed', { folderPath, error: err });
    return false;
  }
};
