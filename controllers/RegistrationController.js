import { parse } from "json2csv";
import RegistrationService from "../services/RegistrationService.js";

export const newRegistration = async (req, res, next) => {
  const data = req.body;
  try {
    const result = await RegistrationService.newRegistration(data);
    res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const filterRegistrations = async (req, res, next) => {
  const data = req.body;
  try {
    const result = await RegistrationService.filterRegistrations(data);
    return res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteRegistration = async (req, res, next) => {
  const id = req.params.id;
  try {
    const result = await RegistrationService.deleteRegistration(id);
    res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};

export const downloadRegistrations = async (req, res, next) => {
  const data = req.body;
  try {
    const result = await RegistrationService.CsvRegistration(data);

    if (result.status === false)
      return res.status(result.statuscode).json(result);

    const { registrations, csvFields } = result;
    const csv = parse(registrations, { fields: csvFields });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="registrations-${Date.now()}.csv"`
    );
    res.setHeader("Content-Length", Buffer.byteLength(csv, "utf8")); // Set Content-Length

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const callbackRegistration = async (req, res, next) => {
  const data = req.body;
  try {
    const result = await RegistrationService.callbackRegistration(data);

    if (result.status === false)
      return res.status(result.statuscode).json(result);

    res.status(result.statuscode).json(result);
  } catch (error) {
    next(error);
  }
};
