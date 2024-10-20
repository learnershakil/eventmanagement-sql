import sql from "mssql";
import redisClient from "../config/redis.js";
import { getRequest } from "../config/sql.js";
import CommonQueries from "../commonQueries/findQueries.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { sendError } from "./ErrorHandler.js";

// Create a new event
export const createEvent = async (req, res, next) => {
  const { title, date, location } = req.body;

  try {
    const request = await getRequest();
    const result = await request
      .input("title", sql.VarChar, title)
      .input("date", sql.DateTime, date)
      .input("location", sql.VarChar, location)
      .query(`
        INSERT INTO Events (title, date, location)
        OUTPUT INSERTED.* 
        VALUES (@title, @date, @location);
      `);

    redisClient.del("Events:AllEvents");
    
    return res.status(STATUSCODE.CREATED).send(result.recordset[0]);
  } catch (error) {
    next(error);
  }
};

// Retrieve all events
export const getAllEvents = async (req, res, next) => {
  try {
    redisClient.get("Events:AllEvents", async (err, redisEvents) => {
      if (err) {
        return next(err);
      }

      if (redisEvents) {
        return res.status(STATUSCODE.OK).json(JSON.parse(redisEvents));
      } else {
        const result = await CommonQueries.findAll({ tableName: "events" });

        if (result.data.length === 0) {
          return sendError(STATUSCODE.NO_CONTENT, "No events found", next);
        }

        redisClient.set("Events:AllEvents", JSON.stringify(result.data));
        return res.status(STATUSCODE.OK).json(result.data);
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete an event by ID
export const deleteEvent = async (req, res, next) => {
  const { id } = req.params;

  try {
    await CommonQueries.findAndDeleteById({ id, tableName: "events" });
    redisClient.del("Events:AllEvents");

    return res.status(STATUSCODE.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};
