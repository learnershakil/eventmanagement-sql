import express from "express";
const router = express.Router();
import {
  newRegistration,
  filterRegistrations,
  downloadRegistrations,
  callbackRegistration,
} from "../controllers/RegistrationController.js";
import userAuth from "../middlewares/authMiddleware.js";

router.post("/new", newRegistration);
router.post("/filter", userAuth, filterRegistrations);
router.post("/download", userAuth, downloadRegistrations);
router.post("/callback", callbackRegistration);

export default router;
