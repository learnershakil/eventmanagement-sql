import redisClient from "../config/redis.js";
import EventServices from "../services/EventService.js";

export const createEvent = async (req, res, next) => {
  const data = req.body;
  const uplodedBy = req.user.userId;
  try {
    const result = await EventServices.createEvent({ ...data, uplodedBy });
    redisClient.del("Event:Events");
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const filterEvents = async (req, res, next) => {
  try {
    redisClient.get("Event:Events", async (err, result) => {
      if (result) {
        const redisEvents = JSON.parse(result);
        return res.status(redisEvents.statuscode || 200).json({
          status: redisEvents.status,
          message: redisEvents.message,
          events: redisEvents.data,
        });
      } else {
        const result = await EventServices.getAllEvents();

        if (result.status)
          redisClient.set("Event:Events", JSON.stringify(result));

        return res.status(result.statuscode).json({
          status: result.status,
          message: result.message,
          events: result.data,
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  const uplodedBy = req.user.userId;
  try {
    const result = await EventServices.updateEvent(id, { ...data, uplodedBy });
    redisClient.del("Event:Events");
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAccommodationPrice = async (req, res, next) => {
  const { price } = req.body;
  try {
    const result = await EventServices.updateAccommodationPrice(price);

    if (result.status) redisClient.del("Event:AccommodationPrice");

    return res
      .status(result.statuscode)
      .json({ ...result, price: Number(result.data) });
  } catch (error) {
    next(error);
  }
};

export const accommodationPrice = async (req, res, next) => {
  try {
    redisClient.get("Event:AccommodationPrice", async (err, result) => {
      if (result) {
        const data = JSON.parse(result);
        return res
          .status(data.statuscode)
          .json({ message: data.message, price: Number(data.data) });
      } else {
        const result = await EventServices.getAccommodationPrice();

        if (result.status)
          redisClient.set("Event:AccommodationPrice", JSON.stringify(result));

        return res
          .status(result.statuscode)
          .json({ message: result.message, price: Number(result.data) });
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  const { eventId } = req.params;
  try {
    const result = await EventServices.deleteEvent(eventId);
    redisClient.del("Event:Events");
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteBrochure = async (req, res, next) => {
  try {
    const result = await EventServices.deleteBrochure();
    return result;
  } catch (error) {
    next(error);
  }
};
