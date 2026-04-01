import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const UPLOAD_BASE_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/data/uploads"
    : path.resolve("uploads"));

const uploadDir = path.join(UPLOAD_BASE_DIR, "products");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    cb(null, `${Date.now()}-${name}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Formato de imagen no permitido"));
  }

  cb(null, true);
}

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});