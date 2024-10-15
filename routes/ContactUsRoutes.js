import express from "express";
import userAuth from "../middlewares/authMiddleware.js";
import { createMessage, deleteMessagePermanently, filterMessages } from "../controllers/MessageController.js";
import { createContactUs, deleteContactUs, getAllContactUs, updateContactUs } from "../controllers/ContactUsController.js";

const router = express.Router();

router.get("/", getAllContactUs);
router.get("/message/filter", userAuth, filterMessages);

// router.put("/message/:id", userAuth, messageController.updateMessage);
router.put("/:id", userAuth, updateContactUs);

router.post("/create", userAuth, createContactUs);
router.post("/message/create", createMessage);

router.delete("/:id", userAuth, deleteContactUs);
router.delete(
  "/message/:id",
  userAuth,
  deleteMessagePermanently
);

export default router;
