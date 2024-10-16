import express from "express";
const router = express.Router();
import { payRegister } from "../controllers/RegistrationController.js";
import userAuth from "../middlewares/authMiddleware.js";

router.get("/:key", payRegister);

export default router;
