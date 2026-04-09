import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
dotenv.config();

const app = express();

/// Connect MongoDB
connectDB();
/// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://event-management-app-1wjp.vercel.app",
  "https://event-management-app-kcwf.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
/// Test route
app.get("/", (req, res) => {
  res.send("API Running successfuly");
});

/// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});
