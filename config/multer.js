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
  limits: { fileSize: 50 * 1024 * 1024 },
}).single("upload");

const handleUpload = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ status: false, error: "File size cannot exceed 50MB." });
        }
      }
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ status: false, error: err.message });
    }

    if (req.file) {
      try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const originalFilePath = req.file.path.toLowerCase();
        const newFilePath = originalFilePath.replace(ext, ".webp");

        if (ext.startsWith(".jp") || ext === ".png") {
          let sharpInstance = sharp(req.file.path);

          // Check file size and reduce if necessary
          const stats = fs.statSync(req.file.path);
          const fileSizeInBytes = stats.size;
          const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

          if (fileSizeInMB > 5) {
            sharpInstance = sharpInstance
              .resize(800, null, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp({ quality: 50, reductionEffort: 6 });
          } else {
            sharpInstance = sharpInstance.webp({
              quality: 80,
              reductionEffort: 6,
            });
          }

          await sharpInstance.toFile(newFilePath);

          // Update file information
          req.file.filename = path.basename(newFilePath);
          req.file.path = newFilePath;
          req.file.originalname = req.file.originalname.replace(
            path.extname(req.file.originalname),
            "low.webp"
          );

          // Delete the original file
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
