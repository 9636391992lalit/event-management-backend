import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  date: {
    type: Date,
    required: true,
  },
  location: String,
  category: String,
  banner: String,
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  registeredUsers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      ticketId: {
        type: String,
        required: true,
      },
      qrToken: {
        type: String,
        required: true,
      },
      attended: {
        type: Boolean,
        default: false,
      },
      checkedInAt: {
        type: Date,
        default: null,
      },
    },
  ],
}, { timestamps: true });

export default mongoose.model("Event", eventSchema);