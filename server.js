require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Member = require("./models/Member");
const seedData = require("./seed-data.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const allowedStatuses = ["Available", "Busy", "Away"];

function normalizeMember(member) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    status: member.status,
    timezone: member.timezone,
    updatedAt: member.updatedAt
  };
}

async function initializeDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");

  const count = await Member.countDocuments();

  if (count === 0) {
    await Member.insertMany(seedData, { ordered: false });
    console.log(`Seeded ${seedData.length} team members`);
  }
}

// GET all members with optional filtering.
app.get("/api/members", async (req, res) => {
  try {
    const { status, role, search } = req.query;
    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (role && role !== "All") {
      query.role = role;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { role: { $regex: search.trim(), $options: "i" } },
        { timezone: { $regex: search.trim(), $options: "i" } }
      ];
    }

    const members = await Member.find(query).sort({ id: 1 }).lean();
    res.json(members);
  } catch (error) {
    console.error("GET /api/members error:", error);
    res.status(500).json({ message: "Failed to load team members." });
  }
});

// GET dashboard statistics.
app.get("/api/stats", async (_req, res) => {
  try {
    const members = await Member.find().lean();

    const stats = {
      total: members.length,
      Available: 0,
      Busy: 0,
      Away: 0
    };

    members.forEach((member) => {
      if (stats[member.status] !== undefined) {
        stats[member.status] += 1;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error("GET /api/stats error:", error);
    res.status(500).json({ message: "Failed to load statistics." });
  }
});

// PATCH status only.
app.patch("/api/members/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid member id." });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Available, Busy, or Away."
      });
    }

    const member = await Member.findOneAndUpdate(
      { id },
      { status },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ message: "Team member not found." });
    }

    const payload = normalizeMember(member);
    io.emit("member:updated", payload);

    res.json(payload);
  } catch (error) {
    console.error("PATCH status error:", error);
    res.status(500).json({ message: "Failed to update status." });
  }
});

// PATCH editable member fields.
app.patch("/api/members/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, role, timezone } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid member id." });
    }

    const update = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof role === "string" && role.trim()) update.role = role.trim();
    if (typeof timezone === "string" && timezone.trim()) update.timezone = timezone.trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Provide at least one editable field." });
    }

    const member = await Member.findOneAndUpdate(
      { id },
      update,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ message: "Team member not found." });
    }

    const payload = normalizeMember(member);
    io.emit("member:updated", payload);

    res.json(payload);
  } catch (error) {
    console.error("PATCH member error:", error);
    res.status(500).json({ message: "Failed to update team member." });
  }
});

// Simple health endpoint for Render.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "team-availability-tracker" });
});

// Socket.IO: send the current data to newly connected clients.
io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  try {
    const members = await Member.find().sort({ id: 1 }).lean();
    socket.emit("members:initial", members);
  } catch (error) {
    console.error("Socket initial sync error:", error);
  }

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initializeDatabase()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup failed:", error);
    process.exit(1);
  });
