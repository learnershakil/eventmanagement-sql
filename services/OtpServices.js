import { INTERNAL_SERVER_ERROR } from "../helpers/commonErrors.js";
import { validateFields } from "../helpers/validators.js";
import bcrypt from "bcrypt";

const createOtpFunc = async (email, otpType) => {
  try {
    const validationResult = validateFields([
      { field: email, message: "Email" },
      { field: otpType, message: "otp type" },
    ]);
    if (!validationResult.status) return validationResult;

    const recentOtp = await getOtpByEmail(email);

    if (recentOtp) {
      return {
        status: false,
        statusCode: STATUSCODE.TOO_MANY_REQUESTS,
        message:
          "You can only request an OTP once per minute. Please try again later.",
      };
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    const result = await pool
      .request()
      .input("otp", sql.VarChar, otp)
      .input("email", sql.VarChar, email)
      .input("type", sql.VarChar, otpType) // Assuming 'type' is a string
      .query(
        "INSERT INTO Otps (otp, email, type) VALUES (@otp, @email, @type)"
      );
    if (result.rowsAffected[0] === 1) {
      //#region Sending Mail

      const mailOptions = createMailOptions({
        to: email,
        subject: "OTP for " + otpType,
        html: generateOtpEmailHtml(otp, otpType),
      });

      await sendMail(mailOptions);

      //#endregion

      // Assuming your otpModel schema has a method to create a JWT
      const token = result.createJWT();
      return {
        status: true,
        message: "OTP sent to email",
        email: mailId,
        token,
      };
    } else {
      return {
        status: false,
        message: "Failed to create OTP",
      };
    }
  } catch (error) {
    return INTERNAL_SERVER_ERROR("Failed to create OTP" + error);
  }
};

const getOtpByEmail = async (email) => {
  try {
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(
        "SELECT * FROM Otps WHERE email = @email AND createdAt >= DATEADD(minute, -1, GETUTCDATE())"
      );
    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[result.recordset.length - 1];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error in getOtpByEmail:", error);
    throw new Error("Database error fetching OTP.");
  }
};

const getOtpById = async (otpId) => {
  try {
    const result = await pool
      .request()
      .input("otpId", sql.Int, otpId) // Assuming otpId is an integer
      .query("SELECT otp, email FROM Otps WHERE id = @otpId");
    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error in getOtpByEmail:", error);
    throw new Error("Database error fetching OTP.");
  }
};

export const verifyOtpFunc = async (otp, otpId) => {
  try {
    validateFields([
      { field: otp, message: "otp" },
      { field: otpId, message: "otp Id" },
    ]);
    const result = await getOtpById(otpId);

    if (!result) {
      return { status: false, message: "Invalid OTP ID" };
    }

    const storedOtp = result.otp;
    const email = result.email;

    const isMatch = await bcrypt.compare(otp, storedOtp);

    if (!isMatch) {
      return { status: false, message: "Incorrect OTP" };
    }

    return { status: true, email: email };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Database error verifying OTP.");
  }
};

const OtpServices = { createOtpFunc, verifyOtpFunc };

export default OtpServices;
