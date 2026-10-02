import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const LOGO_TYPES = [...IMAGE_TYPES, 'image/svg+xml', 'application/pdf'];

const make = (allowed) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    },
  });

export const imageUpload = make(IMAGE_TYPES);
export const logoUpload = make(LOGO_TYPES);
