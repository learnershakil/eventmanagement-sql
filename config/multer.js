import path from "path";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Callback to set the destination
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new Error("Invalid file type. Only JPG, JPEG, PNG, and PDF are allowed.")
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("upload");

const handleUpload = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ status: false, error: "File size cannot exceed 5MB." });
      }
      return res.status(400).json({ status: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ status: false, error: err.message });
    }

    if (req.file) {
      try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const originalFilePath = req.file.path;

        if (ext.startsWith(".jp") || ext === ".png") {
          await sharp(req.file.path)
            .webp({ quality: 80, reductionEffort: 6 })
            .toFile(req.file.path.replace(ext, ".webp"));

          // Update file information (important!)
          req.file.filename = req.file.filename.replace(ext, ".webp");
          req.file.path = req.file.path.replace(ext, ".webp");
          req.file.originalname = req.file.originalname.replace(ext, ".webp");

          // Delete the original file *after* successful conversion
          fs.unlinkSync(originalFilePath);
        }
        // PDF processing can be added here if needed
      } catch (error) {
        console.error("Error processing file:", error);
        // Delete the original file on *error*
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: "File processing failed." });
      }
    }

    next();
  });
};

export default handleUpload;
