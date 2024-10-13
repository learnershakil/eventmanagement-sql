import sql from "mssql";
import { getRequest } from "../config/sql.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from "../helpers/commonErrors.js";
import TABLES from "../Enums/dbTables.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";

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
    const query = `SELECT * FROM ${tableName} WHERE id = @id`;
    request.input("id", sql.Int, id);
    const result = await request.query(query);

    //  More explicit check for empty result set
    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return NOT_FOUND(`No record found with id ${id} in table ${tableName}`);
    }
  } catch (error) {
    console.error(`Error querying ${tableName}:`, error);
    return INTERNAL_SERVER_ERROR(
      `Database query error on ${tableName}: ` + error.message
    );
  }
};

export const findByEmail = async ({
  email,
  tableName,
  otherCondition = "",
}) => {
  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();

    // Parameterize otherCondition if it's being used dynamically
    let query = `SELECT * FROM ${tableName} WHERE email = @email`;
    if (otherCondition) {
      //  Avoid direct string concatenation - prevent SQL injection
      if (!otherCondition.startsWith(" AND ")) {
        // Ensure it starts with AND or similar safe clause
        throw new Error(
          "Invalid otherCondition. Must start with a safe clause like ' AND '."
        );
      }
      query += ` ${otherCondition}`;
    }

    request.input("email", sql.VarChar, email);

    const result = await request.query(query);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return NOT_FOUND(
        `No record found with emait ${email} in table ${tableName}`
      );
    }
  } catch (error) {
    console.error("Error in getOtpByEmail:", error);
    return INTERNAL_SERVER_ERROR("Database query error: " + error.message);
  }
};

export const findAndDeleteById = async ({ id, tableName }) => {
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid ID. ID must be a number.");
  }

  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();

    // First, check if the record exists
    const findQuery = `SELECT * FROM ${tableName} WHERE id = @id`;
    request.input("id", sql.Int, id);
    const findResult = await request.query(findQuery);

    if (findResult.recordset && findResult.recordset.length === 0) {
      return NOT_FOUND(`No record found with id ${id} in table ${tableName}`);
    }

    // If the record exists, then delete it
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = @id`;
    //  No need to re-input 'id' as it's already set
    const deleteResult = await request.query(deleteQuery);

    // Check rows affected to confirm deletion
    if (deleteResult.rowsAffected[0] === 1) {
      return {
        status: true,
        statuscode: STATUSCODE.OK,
        message: `Record with id ${id} deleted successfully from ${tableName}`,
        data: findResult.recordset[0],
      };
    } else {
      // This is unusual - investigate potential database issues
      console.error("Unexpected delete result:", deleteResult);
      return INTERNAL_SERVER_ERROR(
        "Error deleting record.  Please try again later."
      );
    }
  } catch (error) {
    console.error("Error in findAndDeleteById:", error);
    return INTERNAL_SERVER_ERROR("Database error: " + error.message);
  }
};

const CommonQueries = { findAndDeleteById, findByEmail, findOneById };

export default CommonQueries;
