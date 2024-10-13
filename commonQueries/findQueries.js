import sql from "mssql";
import { getRequest } from "../config/sql.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../helpers/commonErrors.js";
import TABLES from "../Enums/dbTables.js";

export const findOneById = async ({ id, tableName }) => {
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid ID. ID must be a number.");
  }
  // Correctly validate tableName against the TABLES enum values
  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();

    // Correct the query syntax
    const query = `SELECT * FROM ${tableName} WHERE id = @id`;

    request.input("id", sql.Int, id);

    const result = await request.query(query);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error querying database:", error);
    return INTERNAL_SERVER_ERROR("Database query error: " + error.message);
  }
};

export const findByEmail = async ({ email, tableName, otherCondition }) => {
  try {
    const request = await getRequest();
    const query = `
      SELECT * FROM ${tableName} WHERE email = @email ${otherCondition};
    `;

    request.input("email", sql.VarChar, email);

    const result = await request.query(query);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[result.recordset.length - 1];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error in getOtpByEmail:", error);
    return INTERNAL_SERVER_ERROR("Database query error: " + error.message);
  }
};
