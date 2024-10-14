import express from "express";
import userAuth from "../middlewares/authMiddleware.js";
import { createMessage, deleteMessagePermanently, filterMessages } from "../controllers/MessageController.js";

const router = express.Router();

// router.get("/", contactUsController.getAllContactUs);
router.get("/message/filter", userAuth, filterMessages);

// router.put("/message/:id", userAuth, messageController.updateMessage);
// router.put("/:id", userAuth, contactUsController.updateContactUs);

// router.post("/create", userAuth, contactUsController.createContactUs);
router.post("/message/create", createMessage);

// router.delete("/:id", userAuth, contactUsController.deleteContactUs);
router.delete(
  "/message/:id",
  userAuth,
  deleteMessagePermanently
);

export default router;
