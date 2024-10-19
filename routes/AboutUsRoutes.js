import express from "express";
import { createAboutUs, deleteGallery, getAboutUs, getAllGallery } from "../controllers/AboutUsController.js";
import userAuth from "../middlewares/authMiddleware.js";

const aboutusRouter = express.Router();
const galleryRouter = express.Router();

//#region About Us

aboutusRouter.get("/", getAboutUs);
aboutusRouter.post("/create", userAuth, createAboutUs);

//#endregion

// #region Gallery


galleryRouter.get("/", getAllGallery);
galleryRouter.delete("/:id", userAuth, deleteGallery);

//#endregion

export { aboutusRouter,galleryRouter };
