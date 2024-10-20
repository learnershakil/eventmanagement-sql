import sql from "mssql";
import redisClient from "../config/redis.js";
import CommonQueries from "../commonQueries/findQueries.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { sendError } from "./ErrorHandler.js";

// Create a new contact message
export const createContactUs = async (req, res, next) => {
  const { name, email, message } = req.body;

  try {
    const request = await getRequest();
    const result = await request
      .input("name", sql.VarChar, name)
      .input("email", sql.VarChar, email)
      .input("message", sql.Text, message)
      .query(`
        INSERT INTO ContactUs (name, email, message)
        OUTPUT INSERTED.* 
        VALUES (@name, @email, @message);
      `);

    return res.status(STATUSCODE.CREATED).send(result.recordset[0]);
  } catch (error) {
    next(error);
  }
};

// Retrieve all contact messages
export const getAllContactMessages = async (req, res, next) => {
  try {
    const result = await CommonQueries.findAll({ tableName: "ContactUs" });

    if (result.data.length == 0) {
      return sendError(STATUSCODE.NO_CONTENT, "No contact messages found", next);
    }

    return res.status(STATUSCODE.OK).json(result.data);
  } catch (error) {
    next(error);
  }
};

// Delete a contact message by ID
export const deleteContactMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await CommonQueries.findAndDeleteById({ id, tableName: "ContactUs" });
    
    if (!result.status) {
      return sendError(STATUSCODE.NOT_FOUND, "Contact message not found", next);
    }

    return res.status(STATUSCODE.OK).send({ message: "Contact message deleted successfully" });
  } catch (error) {
    next(error);
  }
};
