const multer = require('multer');

const MAX_BIN_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BIN_PHOTO_SIZE_BYTES,
    files: 1,
  },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Invalid photo type. Only JPG, PNG, and WEBP are allowed.');
      error.statusCode = 415;
      return cb(error);
    }
    return cb(null, true);
  },
});

// Expects multipart/form-data with a single file under key "photo".
const uploadBinPhoto = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'Photo exceeds the 5MB limit.' });
      }
      return res.status(400).json({ success: false, message: 'Photo upload failed. Attach one valid image.' });
    }

    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Photo upload failed.',
    });
  });
};

module.exports = uploadBinPhoto;
