import express from "express";
import {
  // changeFile,
  deleteFile,
  deleteTempFiles,
  // downloadFile,
  uploadFile,
  viewFile,
} from "../controllers/FilesController.js";
import userAuth from "../middlewares/authMiddleware.js";
import fileHandler from "../config/multer.js";

const router = express.Router();

// Route for UpdateUserById
router.post("/upload", userAuth, fileHandler, uploadFile);
// router.post("/change/:fileId", userAuth, changeFile);
// router.get("/download/:id", downloadFile);
router.get("/view/:id", viewFile);
router.delete("/deleteTempFiles", userAuth, deleteTempFiles);
router.delete("/:id", userAuth, deleteFile);

export default router;
