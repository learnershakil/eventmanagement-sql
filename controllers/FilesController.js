import FileServices from "../services/FileService.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../helpers/commonErrors.js";
import { sendError } from "./ErrorHandler.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import redisClient from "../config/redis.js";

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
    
    if (fileData.used === "Brochure") redisClient.del("Event:Events");

    res.status(result.statuscode).json(result);
  } catch (error) {
    console.error("Error saving file metadata:", error);
    INTERNAL_SERVER_ERROR("Failed to save file metadata. " + error);
  }
};

export const viewFile = async (req, res, next) => {
  const fileId = Number(req.params.id);
  if (typeof fileId !== "number" || isNaN(fileId)) {
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
        const result = await FileServices.findFileById(fileId);
        // Store data in cache for future use
        if (!result || result === null || result === undefined || !result.file)
          return res.status(result.statuscode).json(result);

        redisClient.set("file:" + fileId, JSON.stringify(result));

        if (result.file.startsWith("uploads/")) {
          return res.redirect(`/${result.file}`);
        }

        res.redirect(result.file);
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  const fileId = Number(req.params.id);
  if (typeof fileId !== "number" || isNaN(fileId)) {
    const result = BAD_REQUEST("Invalid File Id");
    return res.status(result.statuscode).json(result);
  }

  try {
    const fileId = req.params.id;

    const result = await FileServices.deleteFileById(fileId);

    return res.status(result.statuscode).json(result);
  } catch (err) {
    return sendError(
      STATUSCODE.INTERNAL_SERVER_ERROR,
      "File Not Deleted\n" + err,
      next
    );
  }
};

export const deleteTempFiles = async (req, res, next) => {
  try {
    const result = await FileServices.deleteTempFiles();

    return res.status(result.statuscode).json(result);
  } catch (err) {
    return sendError(
      STATUSCODE.INTERNAL_SERVER_ERROR,
      "Templary file deletion failed\n" + err,
      next
    );
  }
};
