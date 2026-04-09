import Event from "../models/Event.js";
import jwt from "jsonwebtoken";

const buildTicketId = (eventId, userId) =>
  `TKT-${eventId.toString().slice(-6)}-${userId.toString().slice(-6)}-${Date.now().toString().slice(-5)}`;

const getCheckinSecret = () => process.env.CHECKIN_SECRET || process.env.JWT_SECRET;

/// Create Event (organizer only)
export const createEvent = async (req, res) => {
  try {
    if (req.user.role !== "organizer") {
      return res.status(403).json({ message: "Only organizers can create events" });
    }

    const event = await Event.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/// Get all events
export const getEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
};

/// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
  .select("-registeredUsers.qrToken")
  .populate("registeredUsers.user", "name email");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
};

/// Update event
export const updateEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(updated);
};

/// Delete event
export const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: "Event deleted" });
};
export const registerEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // If the user is already registered, return their existing event-specific ticket.
    const existingEntry = event.registeredUsers.find(
      (entry) => entry.user.toString() === req.user.id
    );
    if (existingEntry) {
      return res.json({
        message: "Already registered",
        ticket: {
          ticketId: existingEntry.ticketId,
          qrToken: existingEntry.qrToken,
          eventId: event._id,
        },
      });
    }

    if (event.registeredUsers.length >= event.capacity) {
      return res.status(400).json({ message: "Event is fully booked" });
    }

    const ticketId = buildTicketId(event._id, req.user.id);
    const qrToken = jwt.sign(
      {
        eventId: event._id.toString(),
        userId: req.user.id,
        ticketId,
        type: "checkin",
      },
      getCheckinSecret(),
      { expiresIn: "30d" }
    );

    event.registeredUsers.push({
      user: req.user.id,
      ticketId,
      qrToken,
      attended: false,
    });
    await event.save();

    res.json({
      message: "Registered successfully",
      ticket: { ticketId, qrToken, eventId: event._id },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.user.role !== "organizer") {
      return res.status(403).json({ message: "Only organizers can mark attendance" });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    const attendee = event.registeredUsers.find(
      (u) => u.user.toString() === userId
    );

    if (!attendee) {
      return res.status(404).json({ message: "User not found" });
    }

    attendee.attended = true;
    attendee.checkedInAt = new Date();

    await event.save();

    res.json({ message: "Attendance marked" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkInWithQR = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ message: "QR token is required" });

    if (req.user.role !== "organizer") {
      return res.status(403).json({ message: "Only organizers can check in attendees" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    const decoded = jwt.verify(qrToken, getCheckinSecret());
    if (decoded.type !== "checkin" || decoded.eventId !== req.params.id) {
      return res.status(400).json({ message: "Invalid QR token for this event" });
    }

    const attendee = event.registeredUsers.find(
      (entry) =>
        entry.user.toString() === decoded.userId &&
        entry.ticketId === decoded.ticketId &&
        entry.qrToken === qrToken
    );

    if (!attendee) {
      return res.status(404).json({ message: "Ticket not found for this event" });
    }

    if (attendee.attended) {
      return res.status(400).json({ message: "Already checked in" });
    }

    attendee.attended = true;
    attendee.checkedInAt = new Date();
    await event.save();

    res.json({
      message: "Check-in successful",
      attendee: { userId: decoded.userId, ticketId: decoded.ticketId, checkedInAt: attendee.checkedInAt },
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired QR token" });
  }
};

export const getEventStats = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const totalRegistered = event.registeredUsers.length;
    const totalAttended = event.registeredUsers.filter((entry) => entry.attended).length;
    const capacity = event.capacity;

    res.json({
      eventId: event._id,
      capacity,
      totalRegistered,
      totalAttended,
      remainingSlots: Math.max(capacity - totalRegistered, 0),
      notAttendedYet: Math.max(totalRegistered - totalAttended, 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyTicket = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const myEntry = event.registeredUsers.find(
      (entry) => entry.user.toString() === req.user.id
    );

    if (!myEntry) {
      return res.status(404).json({ message: "You are not registered for this event" });
    }

    res.json({
      ticketId: myEntry.ticketId,
      qrToken: myEntry.qrToken,
      attended: myEntry.attended,
      checkedInAt: myEntry.checkedInAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};