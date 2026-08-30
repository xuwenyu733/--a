
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/msword": ".doc",
  "text/plain": ".txt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/gif": ".gif",
};

const ALLOWED_EXTS = [
  ".pdf", ".doc", ".docx", ".txt", ".xlsx", ".xls",
  ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext =
      path.extname(file.originalname) || ALLOWED_TYPES[file.mimetype] || "";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES[file.mimetype] || ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("仅支持 PDF、Word、TXT、Excel、图片（jpg/png/webp 等）格式"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
