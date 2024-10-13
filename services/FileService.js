import sql from "mssql";
import { getRequest } from "../config/sql.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { validateFields } from "../helpers/validators.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from "../helpers/commonErrors.js";
import { findOneById } from "../commonQueries/findQueries.js";
import TABLES from "../Enums/dbTables.js";

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

    if (!result || result === null) return NOT_FOUND("File not found");
    if (!result.statuscode) return result;

    return result;
  } catch (error) {
    return INTERNAL_SERVER_ERROR("File Data saving error: " + error.toString());
  }
};

const FileServices = { uploadFileData, findFileById };

export default FileServices;
