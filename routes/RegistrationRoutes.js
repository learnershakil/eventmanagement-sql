import express from "express";
const router = express.Router();
import {
  newRegistration,
  filterRegistrations,
  downloadRegistrations,
  callbackRegistration,
  deleteRegistration,
} from "../controllers/RegistrationController.js";
import userAuth from "../middlewares/authMiddleware.js";

router.post("/new", newRegistration);
router.post("/filter", userAuth, filterRegistrations);
router.post("/download", userAuth, downloadRegistrations);
router.get("/callback", callbackRegistration);
router.post("/callback", callbackRegistration);

router.delete("/:id", userAuth, deleteRegistration);

export default router;
