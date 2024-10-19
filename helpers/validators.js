import validator from "validator";
import STATUSCODE from "./HttpStatusCodes.js";

export const validateFields = (fields) => {
  for (const field of fields) {
    if (
      (!field.field && field.field !== 0) ||
      !field.field.toString() ||
      field.field.toString().trim() === ""
    ) {
      return {
        status: false,
        statuscode: STATUSCODE.NOT_ACCEPTABLE,
        message: field.message + " is required",
      };
    }
    if (field.message && field.message.toLowerCase() === "email") {
      // Check fieldName property
      if (!validator.isEmail(field.field)) {
        return {
          status: false,
          statuscode: STATUSCODE.NOT_ACCEPTABLE,
          message: "Invalid email format",
        };
      }
    }
    // Add similar validation blocks for other field types (e.g., password) as needed
  }

  return { status: true };
};

export const isValidEmail = (email) => {
  if (!validator.isEmail(email)) {
    return {
      status: false,
      statuscode: STATUSCODE.NOT_ACCEPTABLE,
      message: "Invalid email format",
    };
  }
  return { status: true };
};

export const isValidPassword = (password) => {
  if (!password || password.length < 6) {
    return {
      status: false,
      statuscode: STATUSCODE.NOT_ACCEPTABLE,
      message: "Password is required and should be at least 6 characters long",
    };
  }
  return { status: true };
};
