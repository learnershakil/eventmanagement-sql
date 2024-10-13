import sql from "mssql";
import bcrypt from "bcrypt";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import { isValidPassword, validateFields } from "../helpers/validators.js";
import { getRequest } from "../config/sql.js";
import {
  BAD_REQUEST,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from "../helpers/commonErrors.js";
import OtpServices from "./OtpServices.js";
import { createToken } from "../helpers/jwt.js";

const getUserByEmail = async (email) => {
  try {
    const request = await getRequest();
    const query = `
      SELECT * FROM Users WHERE email = @email
    `;

    request.input("email", sql.VarChar, email);

    const result = await request.query(query);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw new Error("Database error fetching user.");
  }
};

const getUserById = async (userId) => {
  if (typeof userId !== "number" || isNaN(userId)) {
    return BAD_REQUEST("Invalid user ID.  ID must be a number.");
  }

  try {
    const request = await getRequest();
    const query = `
      SELECT * FROM Users WHERE id = @id
    `;

    request.input("id", sql.Int, userId);

    const result = await request.query(query);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw new Error("Database error fetching user.");
  }
};

const signup = async (data) => {
  const { fullname, email, password } = data;

  try {
    const validationResult = validateFields([
      { field: fullname, message: "Full name" },
      { field: email, message: "Email" },
      { field: password, message: "Password" },
    ]);
    if (!validationResult.status) return validationResult;

    const existingUserResult = await getUserByEmail(email);

    if (existingUserResult)
      return CONFLICT("Email already registered. Please login");

    const passwordValidationResult = isValidPassword(password);
    if (!passwordValidationResult.status) return passwordValidationResult;

    const hashedPassword = await bcrypt.hash(password, 10);

    const request = await getRequest();
    const query = `
      INSERT INTO Users (fullname, email, password) VALUES (@fullname, @email, @password)
    `;

    request.input("fullname", sql.VarChar, fullname);
    request.input("email", sql.VarChar, email);
    request.input("password", sql.VarChar, hashedPassword);

    const result = await request.query(query);

    const newUserResult = await getUserByEmail(email);

    const userId = newUserResult.id;

    const token = createToken({ userId });

    return {
      status: true,
      statuscode: STATUSCODE.CREATED,
      message: "User created successfully",
      user: { fullname, email },
      token,
    };
  } catch (error) {
    return INTERNAL_SERVER_ERROR("User creatation failed: " + error);
  }
};

const login = async (data) => {
  const { email, password } = data;

  try {
    const validationResult = validateFields([
      { field: email, message: "Email" },
      { field: password, message: "Password" },
    ]);
    if (!validationResult.status) return validationResult;

    const passwordValidationResult = isValidPassword(password);
    if (!passwordValidationResult.status)
      return {
        ...passwordValidationResult,
        message: "Invalid email or password",
      };

    const result = await getUserByEmail(email);

    if (!result || result.isDeleted) return NOT_FOUND("Account not found");

    const user = result;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return BAD_REQUEST("Invalid email or password");

    const data = await OtpServices.createOtpFunc(email, "EMAIL_VERIFICATION");

    return {
      status: true,
      statuscode: STATUSCODE.OK,
      ...data,
      fullname: user.fullname,
    };
  } catch (error) {
    return INTERNAL_SERVER_ERROR("Login Failed: " + error);
  }
};

export const verifyLoginOtp = async (data) => {
  try {
    const result = await OtpServices.verifyOtpFunc(data.otp, data.otpId);
    let token;
    if (result.status) {
      const user = await getUserByEmail(result.email);
      if (user) {
        token = createToken({ userId: user.id });
      }
    }
    return { ...result, token, statuscode: STATUSCODE.ACCEPTED };
  } catch (error) {
    return INTERNAL_SERVER_ERROR("OTP vaidation Failed: " + error);
  }
};

const UserService = {
  signup,
  login,
  getUserByEmail,
  getUserById,
  verifyLoginOtp,
};

export default UserService;
