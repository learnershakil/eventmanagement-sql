import STATUSCODE from "./HttpStatusCodes.js";

export const INTERNAL_SERVER_ERROR = (error) => {
  return {
    status: false,
    statuscode: STATUSCODE.INTERNAL_SERVER_ERROR,
    message: error,
  };
};

export const CONFLICT = (error) => {
  return {
    status: false,
    statuscode: STATUSCODE.CONFLICT,
    message: error,
  };
};

export const NOT_FOUND = (error) => {
  return {
    status: false,
    statuscode: STATUSCODE.NOT_FOUND,
    message: error,
  };
};

export const NO_CONTENT = (error) => {
  return {
    status: false,
    statuscode: STATUSCODE.NO_CONTENT,
    message: error,
  };
};

export const BAD_REQUEST = (error) => {
  return {
    status: false,
    statuscode: STATUSCODE.BAD_REQUEST,
    message: error,
  };
};

export const OK = (message, data) => {
  if (!data) {
    return {
      status: true,
      statuscode: STATUSCODE.OK,
      message: message,
    };
  }
  return {
    status: true,
    statuscode: STATUSCODE.OK,
    message: message,
    data,
  };
};

export const CREATED = (message, data) => {
  return {
    status: true,
    statuscode: STATUSCODE.CREATED,
    message: message,
    data,
  };
};
