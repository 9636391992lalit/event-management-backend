import express from "express";
import { login, signup } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
