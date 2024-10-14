import express from "express";
import {
  createEvent,
  deleteEvent,
  filterEvents,
  // getEventById,
  accommodationPrice,
  updateAccommodationPrice,
  deleteBrochure,
  updateEvent,
  // updateEventBulk,
} from "../controllers/EventController.js";
import userAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route for createEvent
// // router.get("/", updateEventBulk);

router.get("/filter", filterEvents);
router.get("/accommodationPrice", accommodationPrice);
// router.get("/:eventId", getEventById);

router.post("/accommodationPrice", userAuth, updateAccommodationPrice);
router.post("/create", userAuth, createEvent);
router.post("/:id", userAuth, updateEvent);

router.delete("/brochure", userAuth, deleteBrochure);
router.delete("/:eventId", userAuth, deleteEvent);

export default router;
