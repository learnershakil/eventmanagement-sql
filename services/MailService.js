import { APP_PASSWORD, MAIL_ID } from "../ENV.js";
import nodemailer from "nodemailer";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: MAIL_ID,
    pass: APP_PASSWORD,
  },
});

export const createMailOptions = ({
  fromName,
  fromAddress,
  to,
  subject,
  text,
  html,
}) => ({
  from: {
    name: fromName || "MokBhaiMJ",
    address: fromAddress || MAIL_ID,
  },
  to: Array.isArray(to) ? to : [to], // ensure 'to' is an array
  subject: subject || "No Subject",
  text: text || "",
  html: html || "",
});

export const sendMail = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};