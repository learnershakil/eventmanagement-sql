import sql from "mssql";
import jwt from "jsonwebtoken";
import { validateFields } from "../helpers/validators.js";
import { config, getRequest } from "../config/sql.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../helpers/commonErrors.js";
import CommonQueries from "../commonQueries/findQueries.js";
import { createMailOptions, sendMail } from "./MailService.js";
import EventServices from "./EventService.js";
import {
  newRegistrationButtonClick,
  paymentHtml,
} from "../templates/registrationHtmltemplates.js";
import { BaseUrl, CRYPTO_SECRET, PAYMENT_END } from "../ENV.js";
import CryptoJS from "crypto-js";
import crypto from "crypto";
import axios from "axios";
import TABLES from "../Enums/dbTables.js";

const newRegistration = async (data) => {
  const { teamName, team, eventIds } = data;
  try {
    let amount = 0;
    const eventResult = await EventServices.getAllEvents();
    const accommodationFeeResult = await EventServices.getAccommodationPrice();
    const registeredEventsData = [];

    for (const eventId of eventIds) {
      const event = eventResult.data.find((e) => e._id === eventId);
      if (event) {
        amount += parseFloat(event.registrationCharge.amount || 0);
        registeredEventsData.push(event);
      }
    }

    // Calculate accommodation amount if members exist and have opted for accommodation
    if (team && team.length > 0) {
      const membersOptingAccommodation = team.filter(
        (member) => member.optAccomodation
      ).length;
      const accommodationFee = parseFloat(accommodationFeeResult.data);
      amount +=
        membersOptingAccommodation *
        (isNaN(accommodationFee) ? 0 : accommodationFee);
    }
    const validationResult = validateFields([
      { field: teamName, message: "Team name is required" },
      { field: eventIds, message: "Event ID is required" },
      { field: team, message: "Team Member details are required" },
      { field: amount, message: "Amount is required" },
    ]);
    if (!validationResult.status) return validationResult;

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const key = generateUniqueKey();
      const email = team[0].email;
      const phone = team[0].phoneNumber;

      const registrationResult = await transaction
        .request()
        .input("teamName", sql.VarChar, teamName)
        .input("key", sql.VarChar, key)
        .input("email", sql.VarChar, email)
        .input("phone", sql.VarChar, phone)
        .input("amount", sql.Decimal, amount)
        .query(
          `INSERT INTO Registrations (teamName, amount, [key], email, phone) 
          OUTPUT INSERTED.*, INSERTED.id AS registrationId 
          VALUES (@teamName, @amount, @key, @email, @phone); SELECT SCOPE_IDENTITY() AS registrationId;`
        );

      const registrationId = registrationResult.recordset[0].registrationId;

      for (const member of team) {
        await transaction
          .request()
          .input("registrationId", sql.Int, registrationId)
          .input("fullName", sql.VarChar, member.fullname)
          .input("gender", sql.VarChar, member.gender)
          .input("phoneNumber", sql.VarChar, member.phoneNumber)
          .input("email", sql.VarChar, member.email)
          .input("class", sql.VarChar, member.class)
          .input("optAccomodation", sql.Bit, member.optAccomodation)
          .query(
            "INSERT INTO TeamMembers (registrationId, fullName, gender, phoneNumber, email, class, optAccomodation) VALUES (@registrationId, @fullName, @gender, @phoneNumber, @email, @class, @optAccomodation);"
          );
      }

      for (const eventId of eventIds) {
        await transaction
          .request()
          .input("registrationId", sql.Int, registrationId)
          .input("eventId", sql.Int, eventId)
          .query(
            "INSERT INTO RegistrationEvents (registrationId, eventId) VALUES (@registrationId, @eventId);"
          );
      }

      await transaction.commit();

      const paymentLink = BaseUrl + "/reg/" + key;

      // ... (Payment processing, email sending logic - adapt as needed)
      sendRegistrationMail({
        teamName,
        team,
        eventIds,
        amount,
        registeredEventsData,
        paymentLink,
      });

      return {
        status: true,
        statuscode: STATUSCODE.CREATED,
        message: "User Registration Processed\nPayment Status: Pending",
        registrationId: registrationId,
        redirectUrl: paymentLink,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error in Registration:", error.message);
      return INTERNAL_SERVER_ERROR("Error in Registration: " + error.message);
    }
  } catch (error) {
    console.error("Error in Registration:", error.message);
    return INTERNAL_SERVER_ERROR("Error in Registration: " + error.message);
  }
};

const filterRegistrations = async (data) => {
  try {
    const {
      teamName,
      isDeleted,
      paymentStatus,
      teamId,
      page = 1,
      limit = 10,
      noLimit,
    } = data;

    const request = await getRequest();
    let query = `
      SELECT 
          r.id, r.teamName, r.teamId, r.amount, r.paymentId, r.paymentStatus, r.createdAt, r.updatedAt,
          e.eventName, e.eventDate, re.eventId,
          tm.fullName, tm.email, tm.phoneNumber, tm.gender, tm.class, tm.optAccomodation
      FROM Registrations r
      LEFT JOIN RegistrationEvents re ON r.id = re.registrationId
      LEFT JOIN Events e ON re.eventId = e.id
      LEFT JOIN TeamMembers tm ON r.id = tm.registrationId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) AS total FROM Registrations WHERE 1=1`;

    if (teamName) {
      query += " AND r.teamName LIKE @teamName";
      countQuery += " AND teamName LIKE @teamName";
      request.input("teamName", sql.VarChar, `%${teamName}%`);
    }

    if (teamId) {
      query += " AND r.teamId LIKE @teamId";
      countQuery += " AND teamId LIKE @teamId";
      request.input("teamId", sql.VarChar, `%${teamId}%`);
    }

    if (paymentStatus) {
      query += " AND r.paymentStatus = @paymentStatus";
      countQuery += " AND paymentStatus = @paymentStatus";
      request.input("paymentStatus", sql.VarChar, paymentStatus);
    }

    if (isDeleted !== undefined && isDeleted !== "") {
      // Handle both true/false and empty string
      query += " AND r.isDeleted = @isDeleted";
      countQuery += " AND isDeleted = @isDeleted";
      const deletedFilter = isDeleted === "true";
      request.input("isDeleted", sql.Bit, deletedFilter);
    }
    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 10;
    const offset = (pageInt - 1) * limitInt;

    const countResult = await request.query(countQuery);

    let totalRegistrations, totalPages;

    if (!noLimit) {
      totalRegistrations = countResult.recordset[0].total;
      totalPages = Math.ceil(totalRegistrations / limitInt);
      if (pageInt > totalPages && totalPages > 0) {
        return NOT_FOUND("Page not found");
      }

      query += ` ORDER BY r.createdAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      request.input("offset", sql.Int, offset);
      request.input("limit", sql.Int, limitInt);
    }

    const result = await request.query(query);
    let registrations = result.recordset;

    // Group by registration ID
    registrations = registrations.reduce((acc, curr) => {
      const existingRegistration = acc.find((r) => r.id === curr.id);
      if (existingRegistration) {
        // Add team members and events to existing registration
        if (
          curr.fullName &&
          !existingRegistration.teamMembers.find(
            (tm) => tm.fullName === curr.fullName
          )
        ) {
          existingRegistration.teamMembers.push({
            fullName: curr.fullName,
            email: curr.email,
            phoneNumber: curr.phoneNumber,
            gender: curr.gender,
            class: curr.class,
            optAccomodation:
              curr.optAccomodation === undefined ? 0 : curr.optAccomodation,
          });
        }
        if (
          curr.eventName &&
          !existingRegistration.events.find(
            (e) => e.eventName === curr.eventName
          )
        ) {
          // Avoid duplicate events
          existingRegistration.events.push({
            eventName: curr.eventName,
            eventDate: curr.eventDate,
          });
        }
      } else {
        // Create new registration object
        acc.push({
          id: curr.id,
          _id: curr.id,
          teamName: curr.teamName,
          teamId: curr.teamId,
          amount: curr.amount,
          paymentStatus: curr.paymentStatus,
          createdAt: curr.createdAt,
          updatedAt: curr.updatedAt,
          teamMembers: curr.fullName
            ? [
                {
                  fullName: curr.fullName,
                  email: curr.email,
                  phoneNumber: curr.phoneNumber,
                  gender: curr.gender,
                  class: curr.class,
                  optAccomodation:
                    curr.optAccomodation === undefined
                      ? 0
                      : curr.optAccomodation,
                },
              ]
            : [],
          events: curr.eventName
            ? [{ eventName: curr.eventName, eventDate: curr.eventDate }]
            : [],
        });
      }
      return acc;
    }, []);

    registrations = registrations.map((reg) => ({
      registrationId: reg.id,
      _id: reg.id,
      registrationDate: reg.createdAt,
      teamName: reg.teamName,
      teamId: reg.teamId,
      amount: reg.amount,
      payment: {
        paymentStatus: !reg.paymentStatus ? "Pending" : reg.paymentStatus,
        paymentId: reg.paymentId,
      },
      team: reg.teamMembers,
      eventIds: reg.events,
      updatedAt: reg.updatedAt,
    }));

    return {
      status: true,
      statuscode: STATUSCODE.OK,
      message: "Filtered registrations retrieved successfully",
      registrations,
      totalRegistrations,
      totalPages,
      currentPage: pageInt,
    };
  } catch (error) {
    console.error("Error in Getting Registration:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error in Getting Registration: " + error.message
    );
  }
};

const CsvRegistration = async (data) => {
  try {
    const result = await filterRegistrations({ ...data, noLimit: true });
    if (result.status) {
      const registrations = result.registrations;
      // Prepare data for CSV conversion
      const csvFields = [
        { label: "Team Name", value: "teamName" },
        { label: "Payment Status", value: "payment.paymentStatus" },
        { label: "Amount", value: "amount" },
        { label: "Event 1", value: (row) => row.eventIds[0]?.eventName || "" },
        { label: "Event 2", value: (row) => row.eventIds[1]?.eventName || "" },
        { label: "Event 3", value: (row) => row.eventIds[2]?.eventName || "" },
        { label: "Event 4", value: (row) => row.eventIds[3]?.eventName || "" },
        { label: "Member 1", value: (row) => row.team[0]?.fullname || "" },
        { label: "Member 1 Email", value: (row) => row.team[0]?.email || "" },
        {
          label: "Member 1 Phone",
          value: (row) => row.team[0]?.phoneNumber || "",
        },
        { label: "Member 2", value: (row) => row.team[1]?.fullname || "" },
        { label: "Member 2 Email", value: (row) => row.team[1]?.email || "" },
        {
          label: "Member 2 Phone",
          value: (row) => row.team[1]?.phoneNumber || "",
        },
        { label: "Member 3", value: (row) => row.team[2]?.fullname || "" },
        { label: "Member 3 Email", value: (row) => row.team[2]?.email || "" },
        {
          label: "Member 3 Phone",
          value: (row) => row.team[2]?.phoneNumber || "",
        },
        { label: "Member 4", value: (row) => row.team[3]?.fullname || "" },
        { label: "Member 4 Email", value: (row) => row.team[3]?.email || "" },
        {
          label: "Member 4 Phone",
          value: (row) => row.team[3]?.phoneNumber || "",
        },
        { label: "Member 5", value: (row) => row.team[4]?.fullname || "" },
        { label: "Member 5 Email", value: (row) => row.team[4]?.email || "" },
        {
          label: "Member 5 Phone",
          value: (row) => row.team[4]?.phoneNumber || "",
        },
      ];

      return { csvFields, registrations, status: true };
    }
    return result;
  } catch (error) {
    console.error("Error in Getting Registration:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error in Getting Registration: " + error.message
    );
  }
};

const callbackRegistration = async (data) => {
  const { paymentStatus, paymentId } = data;

  try {
    const payment = await CommonQueries.findOneById({
      id: paymentId,
      tableName: TABLES.PAYMENTS,
    });

    if (payment.status == false) {
      return payment;
    }

    const registrationId = payment.registrationId;

    const paymentRequest = await getRequest();
    await paymentRequest
      .input("paymentStatus", sql.VarChar(255), paymentStatus)
      .input("paymentId", sql.VarChar, paymentId).query(`
        UPDATE ${TABLES.PAYMENTS}
        SET paymentStatus = @paymentStatus,
        WHERE id = @paymentId
      `);

    const request = await getRequest();

    // Check if registration exists
    const result = await request
      .input("registrationId", sql.Int, registrationId)
      .query("SELECT * FROM Registrations WHERE id = @registrationId");

    if (result.rowsAffected[0] === 0) {
      return NOT_FOUND("Registration not found");
    }

    const registrationData = result.recordset[0];

    if (registrationData.paymentStatus == "Completed") {
      return OK("Payment status updated!", "");
    }

    const teamId = await generateTeamId();

    // Update the registration
    await request
      .input("teamId", sql.Int, Number(teamId)) // Assuming teamId is an integer
      .input("paymentStatus", sql.VarChar(255), paymentStatus) // Adjust data type as needed
      .input("paymentId", sql.VarChar, paymentId) // Adjust data type as needed
      .query(`
        UPDATE Registrations
        SET teamId = @teamId,
            paymentStatus = @paymentStatus,
            paymentId = @paymentId
        WHERE id = @registrationId
      `);

    const key = registrationData.key;

    const paymentLink = BaseUrl + "/reg/" + key;

    paymentMail(
      { ...registrationData, paymentStatus, paymentId, teamId },
      paymentLink
    );

    return OK("Payment status updated!", "");
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error updating payment status:",
      error.message
    );
  }
};

const deleteRegistration = async (Id) => {
  const id = Number(Id);
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid user ID.  ID must be a number.");
  }
  try {
    await CommonQueries.findAndSoftDeleteById({
      id,
      tableName: "registrations",
    });
    return OK("Registration Deletd!", "");
  } catch (error) {
    console.error("Error deleting Registration Deletd:", error.message);
    return INTERNAL_SERVER_ERROR(
      "Error deleting Registration Deletd:",
      error.message
    );
  }
};

const getRegistrationByKey = async (key) => {
  try {
    const request = await getRequest();

    const result = await request
      .input("key", sql.VarChar, key)
      .query("SELECT * FROM Registrations WHERE [key] = @key");

    // Check if a registration was found
    if (result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error retrieving registration:", error);
    throw error; // Rethrow the error for further handling if needed
  }
};

const generateUniqueKey = () => {
  const timestamp = new Date().getTime().toString(36); // Convert timestamp to base36
  const randomPart = Math.random().toString(36).substring(2, 15); // Generate random string
  return `${timestamp}-${randomPart}`;
};

const sendRegistrationMail = async ({
  teamName,
  team,
  eventIds,
  amount,
  registeredEventsData,
  paymentLink,
}) => {
  const mailTo = team[0].email;
  const subject = "Registration Successful for team " + teamName;
  const text = `Dear ${teamName},\n\nYour registration has been successfully processed. Your payment status is currently pending.\n\nThank you for registering!`;

  const html = newRegistrationButtonClick(
    {
      teamName,
      team,
      eventIds: registeredEventsData,
      amount,
    },
    paymentLink
  );

  const mailOptions = createMailOptions({
    to: mailTo,
    subject: subject,
    text: text,
    html: html,
  });

  // Send email
  const emailSent = await sendMail(mailOptions);

  if (!emailSent) {
    console.error("Failed to send registration email");
  }
};

const generateRandomKey = () => {
  let randomKey = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  const length = 50;
  const hashLength = 15;
  let counter = 0;

  for (let i = 0; i < 5; i = i + 1) {
    counter = 0;
    while (counter < length) {
      randomKey += characters.charAt(
        Math.floor(Math.random() * charactersLength)
      );
      counter += 1;
    }

    counter = 0;
    while (counter < hashLength) {
      randomKey += "/";
      counter += 1;
    }
  }

  counter = 0;
  while (counter < length) {
    randomKey += characters.charAt(
      Math.floor(Math.random() * charactersLength)
    );
    counter += 1;
  }

  return randomKey;
};

const getPublicKey = async (randomKey) => {
  if (!randomKey || !randomKey.trim()) return null;

  try {
    const response = await axios.post(
      PAYMENT_END + "/api/auth/Agreeonkeys",
      JSON.stringify(randomKey),
      {
        headers: {
          "Content-Type": "application/json", // Set the content type to JSON
        },
      }
    );

    return response.data; // Return the response data
  } catch (error) {
    console.log(error.message);
    return null; // Return null or handle the error as needed
  }
};

const generateToken = async (publicKey) => {
  // Define the payload
  const payload = {
    name: "v@lu3_1!",
    type: "s0m3_d@t@",
    org: "7h15_15_@n_3x@mpl3",
    web: "m0r3_5p3c1@l_ch@r$!",
    prod: "d0_n0t_u$3_th1$_1n_pr0duct10n",
  };

  const token = jwt.sign(payload, publicKey);

  // console.log("Generated JWT:", token);
  try {
    const response = await axios.post(
      PAYMENT_END + "/api/auth/validate",
      {},
      {
        headers: {
          Authorization: "Bearer " + String(token),

          "Content-Type": "application/json",
        },
      }
    );

    return token; // Return the response data
  } catch (error) {
    console.log(error.message);
    return null; // Return null or handle the error as needed
  }
};

const getPaymentUrl = async (paymentPayload, token) => {
  // Define the payload
  try {
    const response = await axios.post(
      PAYMENT_END + "/api/auth/new",
      paymentPayload,
      {
        headers: {
          Authorization: String(token),
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log(error.message);
    return null; // Return null or handle the error as needed
  }
};

const generateHash = (data) => {
  const string = data.toString();

  const key = Buffer.from(CRYPTO_SECRET.toString(), "base64");

  if (key.length !== 32) {
    throw new Error("Invalid key length: Key must be 32 bytes for AES-256.");
  }

  const cipher = crypto.createCipheriv("aes-256-ecb", key, null);

  // Encrypt the plaintext
  let encrypted = cipher.update(string, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted.toString();
};

// const encrypt = (plaintext) => {
//   const string = plaintext.toString();
//   // Base64 decode the key
//   const key = Buffer.from(
//     "wTbAVr6scSwcj1tAOz9yvwAluRPXVtrtpbmwPVuAYcE=",
//     "base64"
//   );

//   // Ensure the key length is 32 bytes for AES-256
//   if (key.length !== 32) {
//     throw new Error("Invalid key length: Key must be 32 bytes for AES-256.");
//   }

//   // Create a cipher using AES-256-ECB mode
//   const cipher = crypto.createCipheriv("aes-256-ecb", key, null);

//   // Encrypt the plaintext
//   let encrypted = cipher.update(string, "utf8", "base64");
//   encrypted += cipher.final("base64");

//   return encrypted;
// };

const decrypt = (encryptedText) => {
  try {
    const key = Buffer.from(CRYPTO_SECRET.toString(), "base64");

    if (key.length !== 32) {
      throw new Error("Invalid key length: Key must be 32 bytes for AES-256.");
    }

    // Decode the encrypted text from Base64
    const encryptedBuffer = Buffer.from(encryptedText, "base64");

    const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedBuffer, null, "utf8"); // input as Buffer
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    return null;
  }
};

async function generateTeamId() {
  const request = await getRequest();
  const result = await request.query(
    "SELECT MAX(teamId) + 1 FROM Registrations"
  );
  return result.recordset[0][""] || 1; // Handle case where table is empty
}

const paymentMail = async (data, paymentLink) => {
  const mailTo = data.email;
  const subject =
    "Payment for team " + data.teamName + " is " + data.paymentStatus;
  const text = `Dear ${data.teamName},\n\nYour payment has been successfully processed. Your payment status is currently ${data.paymentStatus} with ${data.paymentId}.`;

  const html = paymentHtml(
    {
      teamName: data.teamName,
      amount: data.amount,
      paymentStatus: data.paymentStatus,
      paymentId: data.paymentId,
    },
    paymentLink
  );

  const mailOptions = createMailOptions({
    to: mailTo,
    subject: subject,
    text: text,
    html: html,
  });

  // Send email
  const emailSent = await sendMail(mailOptions);

  if (!emailSent) {
    console.error("Failed to send payment email");
  }
};

const RegistrationService = {
  generateRandomKey,
  generateToken,
  getRegistrationByKey,
  newRegistration,
  filterRegistrations,
  CsvRegistration,
  deleteRegistration,
  callbackRegistration,
  getPublicKey,
  generateHash,
  decrypt,
  getPaymentUrl,
};

export default RegistrationService;
