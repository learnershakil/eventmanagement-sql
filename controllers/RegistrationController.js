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
  const data = req.query;
  // "?id=" + ID + "&status=" + Status + "&type=" + Type + "&transactionNo=" +
  // TxnID + "&hashedValue=" + hashedValue + "&Course=" + KeyNote + "&KeyNote=" + KeyNote

  // status = SUCCESS, FAILURE, RECORD_NOT_FOUND
  try {
    const registrationId = RegistrationService.decrypt(data.ID);
    const paymentStatus =
      RegistrationService.decrypt(data.status) === "SUCCESS"
        ? "Completed"
        : "Failed";
    const paymentId = RegistrationService.decrypt(data.transactionNo);

    // registrationId, paymentStatus, paymentId
    const result = await RegistrationService.callbackRegistration({
      registrationId,
      paymentStatus,
      paymentId,
    });

    if (result.status === false)
      return res.status(result.statuscode).send(true);

    res.status(result.statuscode).send(true);
  } catch (error) {
    next(error);
  }
};

export const payRegister = async (req, res, next) => {
  try {
    const { key } = req.params;
    const result = await RegistrationService.getRegistrationByKey(key);

    if (!result) {
      const err = new Error("Page Not Found");
      err.statusCode = 404;
      return next(err);
    }

    if (result.paymentStatus === "Completed") {
      const paymentDetailsHtml = paymentCompletedHtml(result);

      return res.status(200).send(paymentDetailsHtml);
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
      order: RegistrationService.generateHash(result.id),
      // order: result.id.toString(),
      name: result.teamName,
      amount: RegistrationService.generateHash(result.amount),
      // amount: result.amount.toString(),
      type: "TechSprint 2024",
      email: result.email,
      mobile: result.phone,
      responseURL: BaseUrl + "/callback",
    };

    // Send token with encrypted amount
    res.status(200).json({ publicKey, token, paymentPayload });
  } catch (error) {
    next(error);
  }
};

const paymentCompletedHtml = (result) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Details</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .payment-details {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h2 {
            color: #007BFF;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            margin: 10px 0;
        }
        strong {
            color: #555;
        }
    </style>
</head>
<body>
    <div class="payment-details">
        <h2>Team Leader Details</h2>
        <p><strong>Team ID:</strong> ${result.teamId}</p>
        <p><strong>Email:</strong> ${result.email}</p>
        <p><strong>Mobile:</strong> ${result.phone}</p>
    </div>
</body>
</html>`;
};
