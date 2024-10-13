import sql from "mssql";
import fs from "fs";
import path from "path";
import { getRequest } from "../config/sql.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { validateFields } from "../helpers/validators.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../helpers/commonErrors.js";
import CommonQueries, { findOneById } from "../commonQueries/findQueries.js";
import TABLES from "../Enums/dbTables.js";
import redisClient from "../config/redis.js";

const uploadFileData = async (data) => {
  try {
    const { type, file, till, used, uplodedBy } = data;

    const validationResult = validateFields([
      { field: type, message: "file type" },
      { field: file, message: "file path" },
      { field: till, message: "file till" },
      { field: used, message: "file used" },
      { field: uplodedBy, message: "uplodedBy" },
    ]);
    if (!validationResult.status) return validationResult;

    const request = await getRequest();

    const query = `
      INSERT INTO files (type, [file], till, used, uplodedBy)
      VALUES (@type, @file, @till, @used, @uplodedBy);
    `;

    request.input("type", sql.VarChar, type);
    request.input("file", sql.VarChar, file);
    request.input("till", sql.Bit, till);
    request.input("used", sql.VarChar, used);
    request.input("uplodedBy", sql.Int, uplodedBy);

    await request.query(query);

    return {
      status: true,
      statuscode: STATUSCODE.CREATED,
      message: "File Data saved",
    };
  } catch (error) {
    return INTERNAL_SERVER_ERROR("File Data saving error: " + error.toString());
  }
};

const findFileById = async (id) => {
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid user ID.  ID must be a number.");
  }
  try {
    const result = await findOneById({ id: id, tableName: TABLES.FILES });

    if (!result || result === null || result.isDeleted)
      return NOT_FOUND("File not found");
    if (!result.statuscode) return result;

    return result;
  } catch (error) {
    return INTERNAL_SERVER_ERROR("File Data saving error: " + error.toString());
  }
};

const deleteFileById = async (fileId) => {
  const id = Number(fileId);
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid user ID.  ID must be a number.");
  }
  try {
    // deleteTempFiles();

    const result = await CommonQueries.findAndDeleteById({
      id,
      tableName: "files",
    });
    if (!result.status) return result;

    const file = result.data;
    const filePath = path.join(__dirname, file.file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found for deletion: ${filePath}`);
    }

    if (file.used === "Gallery") redisClient.del("Gallery:Gallery");
    if (file.used === "AboutUs") redisClient.del("AboutUs:AboutUs");

    redisClient.del("file:" + id);

    return {
      status: true,
      statuscode: STATUSCODE.OK,
      file,
      message: "File Deleted",
    };
  } catch (err) {
    return INTERNAL_SERVER_ERROR("File Deleted failed\n" + err);
  }
};

export const deleteTempFiles = async () => {
  try {
    const request = await getRequest();

    const getFilesQuery = `SELECT id, * FROM Files WHERE till = 0`;
    const result = await request.query(getFilesQuery);
    const files = result.recordset;

    for (const file of files) {
      const id = file.id;
      const filePath = path.join(__dirname, file.file);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        } else {
          console.warn(`File not found for deletion: ${filePath}`);
        }
        CommonQueries.findAndDeleteById({ id, tableName: "files" });
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }

      redisClient.del("file:" + JSON.stringify(id));
    }

    return {
      status: true,
      statuscode: STATUSCODE.NO_CONTENT,
      message: "Temporary files deleted successfully.",
    };
  } catch (error) {
    console.error("Error in deleteTempFiles:", error);
    return INTERNAL_SERVER_ERROR(
      "Database or file system error: " + error.message
    );
  }
};

const updateFileTill = async (ids, used = "", till = "Permanent") => {
  try {
    const request = await getRequest();
    const files = Array.isArray(ids) ? ids : [ids];

    for (const id of files) {
      const updateQuery = `
        UPDATE Files 
        SET till = @till${used ? ", used = @used" : ""} 
        WHERE id = @id
      `;

      request.input("till", sql.VarChar, till);
      request.input("id", sql.Int, id); // Assuming 'id' is an integer
      if (used) {
        request.input("used", sql.VarChar, used);
      }

      request.query(updateQuery);
      redisClient.del("file:" + JSON.stringify(id));
    }
    return OK("files updated succesfully");
  } catch (error) {
    console.error("Error updating file records:", error);
    return INTERNAL_SERVER_ERROR("Error updating file records:", error);
  }
};

const FileServices = {
  uploadFileData,
  findFileById,
  deleteFileById,
  deleteTempFiles,
  updateFileTill,
};

export default FileServices;
