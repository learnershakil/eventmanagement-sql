import sql from "mssql"; // Or your preferred SQL library
import { validateFields } from "../helpers/validators.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
  CREATED,
  NO_CONTENT,
} from "../helpers/commonErrors.js";
import { getRequest } from "../config/sql.js"; // Assuming this provides a configured request object

const createMessage = async (data) => {
  try {
    const { phone, email, message } = data;
    validateFields(
      [
        { field: phone, message: "Phone number is required" },
        { field: email, message: "Email Id is required" },
        { field: message, message: "Message is required" },
      ],
    );

    const request = await getRequest();
    await request
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("message", sql.VarChar, message)
      .query(
        "INSERT INTO Messages (phone, email, message) VALUES (@phone, @email, @message)"
      );

    return CREATED("Message Saved", "");
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error updating payment status:",
      error.message
    );
  }
};

const filterMessages = async (data) => {
  try {
    const { isReaded, isDeleted, type, date } = data;

    let whereClause = "1=1"; // Start with a true condition
    const request = await getRequest();

    if (isReaded !== undefined) {
      whereClause += ` AND isReaded = ${isReaded === "true"}`;
    }

    if (isDeleted !== undefined) {
      whereClause += ` AND isDeleted = ${isDeleted === "true"}`;
    }

    if (type) {
      whereClause += ` AND type = '${type}'`; // Assuming 'type' is a string
    }

    if (date) {
      whereClause += ` AND date = '${date}'`; // Assuming SQL date format
    }

    const result = await request.query(
      `SELECT * FROM Messages WHERE ${whereClause}`
    );
    const messages = result.recordset;

    if (messages.length === 0) {
      return NO_CONTENT("No Messages Found for filter");
    }

    return OK("fetched messages", messages);
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error updating payment status:",
      error.message
    );
  }
};

const updateMessage = async (Id, data) => {
  try {
    const { isReaded, isDeleted } = data;

    const id = Number(Id);
    if (typeof id !== "number") {
      return BAD_REQUEST("Invailid Id");
    }

    const request = await getRequest();
    const result = await request
      .input("isReaded", sql.Bit, isReaded)
      .input("isDeleted", sql.Bit, isDeleted)
      .input("id", sql.Int, id).query(`
                UPDATE Messages 
                SET isReaded = @isReaded, isDeleted = @isDeleted
                WHERE id = @id
            `);

    if (result.rowsAffected[0] === 0) {
      return NOT_FOUND("Message Not Found");
    }

    // Fetch and return the updated message (optional)
    const updatedMessageResult = await request
      .input("id", sql.Int, id)
      .query("SELECT * FROM Messages WHERE id = @id");
    return OK("Message Updated", updatedMessageResult.recordset[0]);
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error updating payment status:",
      error.message
    );
  }
};

const deleteMessagePermanently = async (Id) => {
  try {
    const id = Number(Id);

    if (typeof id !== "number") {
      // Basic integer check; replace with more robust validation if needed
      return BAD_REQUEST("Invailid Id");
    }

    const request = await getRequest();
    const result = await request
      .input("id", sql.Int, id)
      .query("DELETE FROM Messages WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return NOT_FOUND("Message Not Found");
    }

    return OK("Message deleted successfully", "");
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error updating payment status:",
      error.message
    );
  }
};

const MessageService = {
  createMessage,
  filterMessages,
  updateMessage,
  deleteMessagePermanently,
};

export default MessageService;
