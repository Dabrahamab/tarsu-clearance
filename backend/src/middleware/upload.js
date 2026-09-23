const path = require('path');
const fs = require('fs');
const multer = require('multer');

/** Uploads land in backend/uploads (created on demand). */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp)|application\/pdf$/.test(file.mimetype);
  cb(ok ? null : new Error('Only JPG, PNG, WEBP or PDF files are allowed.'), ok);
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadMiddleware, UPLOAD_DIR, storage };