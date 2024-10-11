import sql from "mssql";
import pool from "../config/sql.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { validateFields } from "../helpers/validators.js";

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

    const request = new sql.Request(pool);

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
    return {
      status: false,
      statuscode: STATUSCODE.BAD_REQUEST,
      message: "File Data saving error: " + error.toString(),
    };
  }
};

const FileServices = { uploadFileData };

export default FileServices;
