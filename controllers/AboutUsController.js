import sql from "mssql";
import redisClient from "../config/redis.js";
import { getRequest } from "../config/sql.js";
import CommonQueries from "../commonQueries/findQueries.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import FileServices from "../services/FileService.js";
import { sendError } from "./ErrorHandler.js";

//#region About Us

export const createAboutUs = async (req, res, next) => {
  const { title, description, videos } = req.body;

  try {
    await deleteAboutUs();
    const request = await getRequest();
    const result = await request
      .input("title", sql.VarChar, title)
      .input("videos", sql.VarChar, videos.toString())
      .input("description", sql.Text, description).query(`
        INSERT INTO AboutUs (title, description, videos)
        OUTPUT INSERTED.* 
        VALUES (@title, @description, @videos);
      `);

    redisClient.del("AboutUs:AboutUs");

    // Save About Us in the database
    return res.status(STATUSCODE.OK).send(result.recordset[0]);
  } catch (error) {
    next(error);
  }
};

// Retrieve and return all about us from the database.
export const getAboutUs = async (req, res, next) => {
  try {
    redisClient.get("AboutUs:AboutUs", async (err, redisAboutUs) => {
      if (err) {
        return next(err);
      }

      if (redisAboutUs) {
        return res.status(STATUSCODE.OK).json(JSON.parse(redisAboutUs));
      } else {
        const result = await CommonQueries.findAll({ tableName: "aboutus" });

        if (result.data.length === 0) {
          return sendError(STATUSCODE.NOT_FOUND, "AboutUs not found", next);
        }

        const title = result.data[0].title;
        const description = result.data[0].description;
        const videos = result.data[0].videos ? result.data[0].videos.split(",") : [];

        const data = {
          title,
          description,
          videos,
        };

        redisClient.set("AboutUs:AboutUs", JSON.stringify(data));
        return res.status(STATUSCODE.OK).send(data);
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a about us with the specified aboutUsId in the request
const deleteAboutUs = async () => {
  try {
    const result = await CommonQueries.findAll({ tableName: "aboutus" });
    if (result.status) {
      for (const a of result.data) {
        await CommonQueries.findAndDeleteById({ id: a.id, tableName: "aboutus" });
      }
      redisClient.del("AboutUs:AboutUs");
    }
  } catch (err) {
    throw new Error("AboutUs error: " + err);
  }
};

//#endregion

//#region Gallery

export const getAllGallery = async (req, res, next) => {
  const redisKey = "Gallery:Gallery";
  redisClient.get(redisKey, async (err, redisData) => {
    if (err) {
      return next(err);
    }

    if (redisData) {
      return res.status(STATUSCODE.OK).json(JSON.parse(redisData));
    } else {
      try {
        const request = await getRequest();
        const result = await request.query(`
                    SELECT * 
                    FROM files
                    WHERE used = 'Gallery' AND till = 1 AND isDeleted = 0;
                `);

        const photos = result.recordset.map((item) => ({
          _id: item.Id || item.id,
          file: item.file,
        }));

        if (photos.length === 0) {
          return sendError(
            STATUSCODE.NO_CONTENT,
            "No Gallery Photos found",
            next
          );
        }

        const data = { photos };
        redisClient.set(redisKey, JSON.stringify(data));
        return res.status(STATUSCODE.OK).json(data);
      } catch (err) {
        next(err);
      }
    }
  });
};

export const deleteGallery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await FileServices.deleteFileById(id);

    redisClient.del("Gallery:Gallery");

    res.send({ ...result });
  } catch (err) {
    next(err);
  }
};

//#endregion
