import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_EXPIRY = "1d";
const MONGODB_URI = process.env.MONGODB_URI;
const APP_PASSWORD = process.env.APP_PASSWORD;
const MAIL_ID = process.env.MAIL_ID;
export const MSSQL_PASS = process.env.MSSQL_PASS;
export const MSSQL_USER = process.env.MSSQL_USER;
export const MSSQL_DBNAME = process.env.MSSQL_DBNAME;
export const MSSQL_PORT = process.env.MSSQL_PORT;
export const MSSQL_IP = process.env.MSSQL_IP;
export const UploadsFolder = process.env.FILES_UPLOAD_FOLDER;
export const BaseUrl = process.env.BASE_URL;

export {
  PORT,
  JWT_SECRET_EXPIRY,
  JWT_SECRET,
  MONGODB_URI,
  MAIL_ID,
  APP_PASSWORD,
};
