import JWT from "jsonwebtoken";
import { JWT_SECRET, JWT_SECRET_EXPIRY } from "../ENV.js";

export const createToken = (data) => {
  return JWT.sign({ ...data }, JWT_SECRET, {
    expiresIn: JWT_SECRET_EXPIRY,
  });
};
