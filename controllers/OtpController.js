import OTPTYPE from "../Enums/OtpTypes.js";
import sql from "mssql";
import pool from "../config/sql.js";
import { sendError, validateFields } from "./ErrorHandler.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { createMailOptions, sendMail } from "./MailController.js";
import { generateOtpEmailHtml } from "../templates/emailHtmlTemplate.js";
import JWT from "jsonwebtoken";

export const createOtp = async (req, res, next) => {
  const { mailId, otpType } = req.body;

  try {
    validateFields(
      [
        { field: mailId, message: "Email Id is required" },
        { field: otpType, message: "otpType is required" },
      ],
      next
    );

    if (otpType === OTPTYPE.PASSWORD_RESET) {
      const existingUserResult = await pool
        .request()
        .input("mailId", sql.VarChar, mailId)
        .query("SELECT 1 FROM Users WHERE email = @mailId"); // Use email column

      if (existingUserResult.recordset.length === 0) {
        return sendError(
          STATUSCODE.BAD_REQUEST,
          "Email is not registered. Please register",
          next
        );
      }
    }

    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    const recentOtpResult = await pool
      .request()
      .input("mailId", sql.VarChar, mailId)
      .input("oneMinuteAgo", sql.DateTime2, oneMinuteAgo)
      .query(
        "SELECT 1 FROM OTPs WHERE mailId = @mailId AND createdAt >= @oneMinuteAgo"
      );

    if (recentOtpResult.recordset.length > 0) {
      return sendError(
        STATUSCODE.TOO_MANY_REQUESTS,
        "You can only request an OTP once per minute. Please try again later.",
        next
      );
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    const result = await pool
      .request()
      .input("otp", sql.VarChar, otp.toString()) // Convert otp to string
      .input("mailId", sql.VarChar, mailId)
      .input("otpType", sql.VarChar, otpType)
      .query(
        "INSERT INTO OTPs (otp, mailId, type) VALUES (@otp, @mailId, @otpType); SELECT SCOPE_IDENTITY() AS insertedId"
      ); // Get inserted ID

    const insertedId = result.recordset[0].insertedId;

    const mailOptions = createMailOptions({
      to: mailId,
      subject: "OTP for " + otpType,
      html: generateOtpEmailHtml(otp, otpType),
    });

    await sendMail(mailOptions);

    const token = JWT.sign({ otpId: insertedId }, JWT_SECRET, {
      expiresIn: JWT_SECRET_EXPIRY,
    });

    res.status(STATUSCODE.CREATED).send({
      success: true,
      message: "OTP sent to email",
      mail: mailId,
      token,
    });
  } catch (error) {
    next(error);
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
};
