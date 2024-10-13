import sql from "mssql";
import { getRequest } from "../config/sql.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../helpers/commonErrors.js";
import TABLES from "../Enums/dbTables.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";

export const findAll = async ({ tableName }) => {
  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }
  try {
    const request = await getRequest();
    const query = `SELECT * FROM ${tableName}`;
    const result = await request.query(query);

    //  More explicit check for empty result set
    if (result.recordset && result.recordset.length > 0) {
      return OK(
        `${result.recordset.length} Records found in ${tableName}`,
        result.recordset
      );
    } else {
      return NOT_FOUND(`No record found in table ${tableName}`);
    }
  } catch (error) {
    console.error(`Error querying ${tableName}:`, error);
    return INTERNAL_SERVER_ERROR(
      `Database query error on ${tableName}: ` + error.message
    );
  }
};

export const findOneById = async ({ id, tableName }) => {
  const Id = Number(id);
  if (typeof Id !== "number" || isNaN(Id)) {
    return BAD_REQUEST("Invalid ID. ID must be a number.");
  }
  // Correctly validate tableName against the TABLES enum values
  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();
    const query = `SELECT * FROM ${tableName} WHERE id = @id`;
    request.input("id", sql.Int, Id);
    const result = await request.query(query);

    //  More explicit check for empty result set
    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return NOT_FOUND(`No record found with id ${Id} in table ${tableName}`);
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
  const Id = Number(id);
  if (typeof Id !== "number" || isNaN(Id)) {
    return BAD_REQUEST("Invalid ID. ID must be a number.");
  }

  if (!Object.values(TABLES).includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();

    // First, check if the record exists
    const findQuery = `SELECT * FROM ${tableName} WHERE id = @id`;
    request.input("id", sql.Int, Id);
    const findResult = await request.query(findQuery);

    if (findResult.recordset && findResult.recordset.length === 0) {
      return NOT_FOUND(`No record found with Id ${Id} in table ${tableName}`);
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
        message: `Record with id ${Id} deleted successfully from ${tableName}`,
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

export const findAndSoftDeleteById = async ({ id, tableName, userId }) => {
  const Id = Number(id);
  if (typeof Id !== "number" || isNaN(Id)) {
    return BAD_REQUEST("Invalid ID. ID must be a number.");
  }

  // Validate tableName against allowed tables (important for security)
  const allowedTables = Object.values(TABLES); // Assuming TABLES is an enum or object of allowed table names
  if (!allowedTables.includes(tableName)) {
    return BAD_REQUEST(`Invalid table name: ${tableName}.`);
  }

  try {
    const request = await getRequest();

    // Use an UPDATE query for soft delete
    const updateQuery = `
            UPDATE ${tableName} 
            SET isDeleted = 1
            OUTPUT INSERTED.* 
            WHERE id = @id AND isDeleted = 0;
        `;

    request.input("id", sql.Int, Id);
    request.input("deletedBy", sql.Int, userId || null);

    const result = await request.query(updateQuery);

    if (result.recordset && result.recordset.length === 1) {
      return {
        status: true,
        statuscode: STATUSCODE.OK,
        message: `Record with id ${Id} soft deleted successfully from ${tableName}`,
        data: result.recordset[0], // Return the updated record directly
      };
    } else if (result.rowsAffected[0] === 0) {
      // Check rowsAffected if recordset is empty (some mssql versions)
      return NOT_FOUND(
        `No record found with id ${Id} in table ${tableName} or already deleted.`
      );
    }
  } catch (error) {
    console.error("Error in findAndDeleteById:", error);
    return INTERNAL_SERVER_ERROR("Database error: " + error.message);
  }
};

const CommonQueries = {
  findAndDeleteById,
  findByEmail,
  findOneById,
  findAndSoftDeleteById,
  findAll,
};

export default CommonQueries;
