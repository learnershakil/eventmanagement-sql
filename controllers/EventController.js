import EventServices from "../services/EventService.js";

export const createEvent = async (req, res, next) => {
  const data = req.body;
  const uplodedBy = req.user.userId;
  try {
    const result = await EventServices.createEvent({ ...data, uplodedBy });
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const filterEvents = async (req, res, next) => {
  try {
    const result = await EventServices.getAllEvents();
    return res
      .status(result.statuscode)
      .json({ ...result, events: result.data });
  } catch (error) {
    next(error);
  }
};
