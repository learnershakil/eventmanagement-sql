import MessageService from "../services/MessageService.js";

export const createMessage = async (req, res, next) => {
  try {
    const data = req.body;

    const result = await MessageService.createMessage(data);
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const filterMessages = async (req, res, next) => {
  try {
    const data = req.body;

    const result = await MessageService.filterMessages(data);
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateMessage = async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const result = await MessageService.updateMessage(id, data);
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteMessagePermanently = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await MessageService.deleteMessagePermanently(id);
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};
