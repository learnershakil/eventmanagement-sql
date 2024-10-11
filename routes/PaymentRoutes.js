import express from "express";
import {
  createPayment,
  failedPayment,
  successPayment,
} from "../controllers/PaymentController.js";
const router = express.Router();

router.post("/success", successPayment);
router.post("/failed", failedPayment);
router.get("/new/:registrationId", createPayment);

export default router;
