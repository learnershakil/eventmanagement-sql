import express from "express";
import UserRoutes from "./UserRoutes.js";
import EventRoutes from "./EventRoutes.js";
import FileRoutes from "./FileRoutes.js";
import RegistrationRoutes from "./RegistrationRoutes.js";
// import PatmentRoutes from "./PaymentRoutes.js";
import ContactUsRoutes from "./ContactUsRoutes.js";
import {
  aboutusRouter,
  galleryRouter,
} from "./AboutUsRoutes.js";

const router = express.Router();

router.use("/user", UserRoutes);
router.use("/file", FileRoutes);
router.use("/event", EventRoutes);
router.use("/registration", RegistrationRoutes);
router.use("/contactUs", ContactUsRoutes);
router.use("/aboutUs", aboutusRouter);
router.use("/gallery", galleryRouter);
// router.use("/socialMedia", socialMediaRouter);
// router.use("/payment", PatmentRoutes);

export default router;
