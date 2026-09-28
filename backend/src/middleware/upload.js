const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Delivery proof uploads.
 *
 * multer's diskStorage writes the file to /uploads/proofs before the
 * controller validates the OTP, so a rejected delivery attempt can leave an
 * orphan file on disk. The controller deletes it on the failure paths — see
 * removeProof(). That is deliberate: keeping OTP verification in one place
 * rather than splitting the check across the storage layer and the handler.
 */
const PROOF_DIR = path.join(__dirname, '..', '..', 'uploads', 'proofs');

if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, PROOF_DIR);
  },
  filename(req, file, cb) {
    // The client filename is never trusted — a random name plus a
    // whitelisted extension avoids path traversal and collisions entirely.
    const ext = ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase())
      ? path.extname(file.originalname).toLowerCase()
      : '.jpg';
    cb(null, `proof-${tripIdFromRequest(req)}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});

function tripIdFromRequest(req) {
  const raw = req.params && req.params.id;
  return String(raw || 'unknown').replace(/\D/g, '') || 'unknown';
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
    const error = new Error('Proof photo must be a JPG or PNG image.');
    error.code = 'PROOF_TYPE';
    return cb(error);
  }
  return cb(null, true);
}

const uploadProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 }
}).single('proof');

/**
 * Wrap the multer middleware so its errors become a clean 400/413 instead of
 * a 500 from a thrown MulterError.
 */
function proofUpload(req, res, next) {
  uploadProof(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Proof photo must be 5 MB or smaller.'
      });
    }
    if (error.code === 'PROOF_TYPE') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return next(error);
  });
}

/** Public path of an uploaded file, as stored in trips.delivery_proof_url. */
function proofPublicPath(filename) {
  return `/uploads/proofs/${filename}`;
}

/** Absolute path for unlinking, from either a bare filename or a public path. */
function proofAbsolutePath(storedPath) {
  const filename = path.basename(String(storedPath || ''));
  return path.join(PROOF_DIR, filename);
}

/** Best-effort delete; a missing file is not an error worth surfacing. */
function removeProof(storedPath) {
  if (!storedPath) return;
  try {
    fs.unlinkSync(proofAbsolutePath(storedPath));
  } catch {
    // Already gone, or never written — nothing to clean up.
  }
}

module.exports = {
  proofUpload,
  proofPublicPath,
  proofAbsolutePath,
  removeProof,
  PROOF_DIR,
  MAX_SIZE_BYTES,
  ALLOWED_MIME
};
