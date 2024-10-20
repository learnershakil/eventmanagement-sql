import sql from "mssql";
import redisClient from "../config/redis.js";
import { getRequest } from "../config/sql.js";
import CommonQueries from "../commonQueries/findQueries.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { sendError } from "./ErrorHandler.js";
import FileServices from "../services/FileService.js";

// Upload a new file
export const uploadFile = async (req, res, next) => {
  const { file, type } = req.body;

  try {
    const request = await getRequest();
    const result = await request
      .input("file", sql.VarChar, file)
      .input("type", sql.VarChar, type)
      .query(`
        INSERT INTO Files (file, type)
        OUTPUT INSERTED.* 
        VALUES (@file, @type);
      `);

    redisClient.del("Files:AllFiles");

    return res.status(STATUSCODE.CREATED).send(result.recordset[0]);
  } catch (error) {
    next(error);
  }
};

// Retrieve all files
export const getAllFiles = async (req, res, next) => {
  try {
    redisClient.get("Files:AllFiles", async (err, redisFiles) => {
      if (err) {
        return next(err);
      }

      if (redisFiles) {
        return res.status(STATUSCODE.OK).json(JSON.parse(redisFiles));
      } else {
        const result = await CommonQueries.findAll({ tableName: "files" });

        if (result.data.length === 0) {
          return sendError(STATUSCODE.NO_CONTENT, "No files found", next);
        }

        redisClient.set("Files:AllFiles", JSON.stringify(result.data));
        return res.status(STATUSCODE.OK).json(result.data);
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a file by ID
export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  try {
    await FileServices.deleteFileById(id);
    redisClient.del("Files:AllFiles");

    return res.status(STATUSCODE.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};
