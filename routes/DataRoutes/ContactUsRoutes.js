import express from "express";
import {
  messageController,
  contactUsController,
} from "../../controllers/DataControllers/ContactUsController.js";
import userAuth from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", contactUsController.getAllContactUs);
router.get("/message/filter", userAuth, messageController.filterMessages);

router.put("/message/:id", userAuth, messageController.updateMessage);
router.put("/:id", userAuth, contactUsController.updateContactUs);

router.post("/create", userAuth, contactUsController.createContactUs);
router.post("/message/create", messageController.createMesage);

router.delete("/:id", userAuth, contactUsController.deleteContactUs);
router.delete(
  "/message/:id",
  userAuth,
  messageController.deleteMessagePermanently
);

export default router;
