import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  registerEvent,
  deleteEvent,
  markAttendance,
  checkInWithQR,
  getEventStats,
  getMyTicket,
} from "../controllers/eventController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createEvent);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.put("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);
router.post("/:id/register", authMiddleware, registerEvent);
router.post("/:id/attendance", authMiddleware, markAttendance);
router.post("/:id/checkin", authMiddleware, checkInWithQR);
router.get("/:id/stats", authMiddleware, getEventStats);
router.get("/:id/my-ticket", authMiddleware, getMyTicket);
export default router;