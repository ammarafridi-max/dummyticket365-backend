const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Cloudinary credentials are missing');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.cloudinary = cloudinary;

exports.uploadImageToCloudinary = async (buffer, folder) => {
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
    if (!imageUrl) return;

    const match = imageUrl.match(/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match || !match[1]) return;

    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Failed to delete Cloudinary file:', err.message);
  }
};

exports.deleteCloudinaryFolder = async (folderPath) => {
  try {
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 100,
    });

    for (const file of resources) {
      await cloudinary.uploader.destroy(file.public_id);
    }

    await cloudinary.api.delete_folder(folderPath);
  } catch (err) {
    console.error('Cloudinary cleanup failed:', err.message);
  }
};
