import FileServices from "../services/FileService.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../helpers/commonErrors.js";

export const uploadFile = async (req, res) => {
  const { userId } = req.user;
  const { type } = req.body;

  if (!req.file) {
    return BAD_REQUEST("No file uploaded.");
  }

  const fileData = {
    type: type,
    file: `/uploads/${req.file.filename}`,
    till: type === "Brochure" ? 1 : 0,
    used: type,
    uplodedBy: userId,
  };

  try {
    const result = await FileServices.uploadFileData(fileData);

    res.status(result.statuscode).json(result);
  } catch (error) {
    console.error("Error saving file metadata:", error);
    INTERNAL_SERVER_ERROR("Failed to save file metadata. " + error);
  }
};

export const viewFile = async (req, res) => {
  const fileId = req.params.id;
  if (!isNaN(fileId)) {
    const result = BAD_REQUEST("Invalid File Id");
    return res.status(result.statuscode).json(result);
  }

  try {
    // Check if data is in cache
    await redisClient.get("file:" + fileId, async (err, result) => {
      if (result) {
        // If data is in cache, send it
        const file = JSON.parse(result);
        if (!file || file === null || file === undefined || !file.file)
          return sendError(STATUSCODE.NOT_FOUND, "File not found", next);

        // Redirect to the file path
        if (file.file.startsWith("uploads/")) {
          return res.redirect(
            `/${file.file}?length=${file.length}&width=${file.width}`
          );
        }

        return res.redirect(file.file);
      } else {
        // If data is not in cache, fetch it from the database
        const file = await File.findById(fileId);
        // Store data in cache for future use
        if (!file || file === null || file === undefined || !file.file)
          return sendError(STATUSCODE.NOT_FOUND, "File not found", next);

        redisClient.set("file:" + fileId, JSON.stringify(file));

        if (file.type.startsWith("image/")) {
          return res.redirect(file.file);
        }

        // Redirect to the file path
        res.redirect(`/${file.file}`);
      }
    });
  } catch (err) {
    next(err);
  }
};
