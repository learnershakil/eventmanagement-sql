import redisClient from "../config/redis.js";
import ContactUsService from "../services/ContactUsServices.js";

export const createContactUs = async (req, res, next) => {
  try {
    const data = req.body;

    const result = await ContactUsService.createContactUs(data);
    if (!result.status) return res.status(result.statuscode).json(result);
    redisClient.del("ContactUs");
    return res.status(result.statuscode).json({ ...result.data });
  } catch (error) {
    next(error);
  }
};

export const getAllContactUs = async (req, res, next) => {
  redisClient.get("ContactUs", async (err, redisContactUs) => {
    if (err) {
      return next(err);
    }

    if (redisContactUs) {
      return res.status(200).json(JSON.parse(redisContactUs));
    } else {
      try {
        const result = await ContactUsService.getAllContactUs();
        if (!result.status) return res.status(result.statuscode).json(result);

        const data = result.data.map((data) => ({ ...data, _id: data.id }));

        redisClient.set("ContactUs", JSON.stringify(data));
        return res.status(result.statuscode).json(data);
      } catch (error) {
        next(error);
      }
    }
  });
};

export const updateContactUs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Validate id
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return res.status(400).json(BAD_REQUEST("Invalid contact ID"));
    }

    const result = await ContactUsService.updateContactUs({
      id: numericId,
      ...data,
    });
    if (!result.status) return res.status(result.statuscode).json(result);

    redisClient.del("ContactUs");
    return res.status(200).json({ ...result.data });
  } catch (error) {
    next(error);
  }
};

export const deleteContactUs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return res.status(400).json(BAD_REQUEST("Invalid contact ID"));
    }

    const result = await ContactUsService.deleteContactUs(numericId);
    if (!result.status) return res.status(result.statuscode).json(result);

    redisClient.del("ContactUs");
    return res.status(200).json({ ...result.data });
  } catch (error) {
    next(error);
  }
};
