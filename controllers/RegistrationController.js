import { parse } from "json2csv";
import RegistrationService from "../services/RegistrationService.js";
import CryptoJS from "crypto-js";
import { BaseUrl, FRONTEND_URL, JWT_SECRET, PAYMENT_END } from "../ENV.js";
import axios from "axios";
import PaymentServices from "../services/PaymentService.js";

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
    const paymentId = RegistrationService.decrypt(data.id);
    const paymentStatus =
      RegistrationService.decrypt(data.status) === "SUCCESS"
        ? "Completed"
        : "Failed";

    if (!paymentId) return res.status(500).send(InternalServerHtml());
    if (!paymentStatus) return res.status(500).send(InternalServerHtml());

    // registrationId, paymentStatus, paymentId
    const result = await RegistrationService.callbackRegistration({
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

    const paymentResult = await PaymentServices.createPayment(
      result.id,
      result.amount
    );

    if (!paymentResult) return res.status(500).send(InternalServerHtml());

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
    if (!publicKey) return res.status(500).send(InternalServerHtml());

    const token = await RegistrationService.generateToken(publicKey);
    if (!token) return res.status(500).send(InternalServerHtml());

    const paymentPayload = {
      order: RegistrationService.generateHash(paymentResult),
      name: result.teamName,
      amount: RegistrationService.generateHash(result.amount),
      type: "TechSprint2024",
      email: result.email,
      mobile: result.phone,
      responseURL: BaseUrl + "/api/registration/callback",
    };

    const paymentUrl = await RegistrationService.getPaymentUrl(
      paymentPayload,
      token
    );
    if (!paymentUrl) return res.status(500).send(InternalServerHtml());

    res.redirect(paymentUrl);

    // return res
    //   .status(200)
    //   .json({ publicKey, token, paymentPayload, paymentUrl });
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
            background-color: #000; /* Set background to black */
            color: #fff; /* Set text color to white for contrast */
            margin: 0;
            padding: 20px;
        }
        .payment-details {
            max-width: 600px;
            margin: 0 auto;
            background-color: #333; /* Dark gray background for the container */
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.1); /* Light shadow for contrast */
        }
        h2 {
            color: #007BFF; /* Blue color for the heading */
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            margin: 10px 0;
        }
        strong {
            color: #ccc; /* Light gray for strong text */
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

const InternalServerHtml = () => {
  return `
  <html>
    <head>
      <title>Internal Server Error</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #000; /* Set background to black */
          color: #fff; /* Set text color to white for contrast */
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          background-color: #333; /* Dark gray background for the container */
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1); /* Light shadow for contrast */
        }
        h1 {
          font-size: 48px;
          color: #e74c3c; /* Red color for the error message */
        }
        p {
          font-size: 18px;
          margin-top: 20px;
        }
        a {
          display: inline-block;
          margin-top: 30px;
          padding: 10px 20px;
          background-color: #3498db; /* Blue background for the button */
          color: #fff; /* White text color for the button */
          text-decoration: none;
          border-radius: 5px;
          transition: background-color 0.3s;
        }
        a:hover {
          background-color: #2980b9; /* Darker blue on hover */
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>500 Internal Server Error</h1>
        <p>Oops! Something went wrong on our end. Please try again later.</p>
        <a href="${FRONTEND_URL}">Go Back to Home</a>
      </div>
    </body>
  </html>
  `;
};
