import { parse } from "json2csv";
import RegistrationService from "../services/RegistrationService.js";
import CryptoJS from "crypto-js";
import { BaseUrl, JWT_SECRET } from "../ENV.js";

export const newRegistration = async (req, res, next) => {
  const data = req.body;
  try {
    const result = await RegistrationService.newRegistration(data);
    if (!result.status) res.status(result.statuscode).json(result);

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

export const payRegister = async (req, res, next) => {
  try {
    const { key } = req.params;
    const result = await RegistrationService.getRegistrationByKey(key);

    if (!result) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (result.paymentStatus === "Completed") {
      return res.status(200).json({ message: "Payment is completed" });
    }

    // generateHash({
    //   orderId: "1",
    //   name: "Mokshit",
    //   amount: "100.00",
    //   type: "TechSprint",
    //   email: "mokshitjain18@gmail.com",
    //   mobile: "",
    // });

    const randomKey = RegistrationService.generateRandomKey();
    const publicKey = await RegistrationService.getPublicKey(randomKey);
    const token = await RegistrationService.generateToken(publicKey);

    const paymentPayload = {
      order: await RegistrationService.generateHash(result.id),
      name: result.teamName,
      amount: await RegistrationService.generateHash(result.amount),
      type: "TechSprint",
      email: result.email,
      mobile: result.phone,
      responceURL: BaseUrl + "/callback",
    };

    // Send token with encrypted amount
    res.status(200).json({ publicKey, token, paymentPayload });
  } catch (error) {
    next(error);
  }
};
