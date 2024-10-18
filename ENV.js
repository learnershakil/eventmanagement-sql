import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT;
export const JWT_SECRET = process.env.JWT_SECRET;
export const CRYPTO_SECRET = process.env.CRYPTO_SECRET;
export const JWT_SECRET_EXPIRY = "1d";
export const MONGODB_URI = process.env.MONGODB_URI;
export const APP_PASSWORD = process.env.APP_PASSWORD;
export const MAIL_ID = process.env.MAIL_ID;
export const MSSQL_PASS = process.env.MSSQL_PASS;
export const MSSQL_USER = process.env.MSSQL_USER;
export const MSSQL_DBNAME = process.env.MSSQL_DBNAME;
export const MSSQL_PORT = process.env.MSSQL_PORT;
export const MSSQL_IP = process.env.MSSQL_IP;
export const UploadsFolder = process.env.FILES_UPLOAD_FOLDER;
export const BaseUrl = process.env.BASE_URL;
export const FRONTEND_URL = process.env.FRONTEND_URL;
