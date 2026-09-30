const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();


const app = express();
const PORT = 3001;

// Sessions last 30 days; rooms are the only identity in the system.
const TOKEN_TTL = "30d";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

const { JWT_SECRET, TEXT_SECRET } = process.env;

// Falling back to a built-in key would make every deployment trivially
// forgeable, so refuse to start without real secrets.
for (const [name, value] of Object.entries({ JWT_SECRET, TEXT_SECRET })) {
  if (!value) {
    console.error(`Missing ${name}. Set it in the environment before starting.`);
    process.exit(1);
  }
}

// --- Core middleware
// Behind Render's proxy, so req.ip should come from X-Forwarded-For.
app.set("trust proxy", true);
app.use(express.json({ limit: "25mb" }));

app.use(
  cors({
    origin: ["https://shareit-lite.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/* ===================== TEXT ENCRYPTION =====================
 * Notes are stored as ciphertext and only ever decrypted on the way out, so
 * the database never holds readable text. The stored form is
 * `v1:<iv>:<authTag>:<ciphertext>`, all base64 — the leading version tag is
 * what tells `decryptText` how to read the rest.
 */
const CIPHER_PREFIX = "v1";
const textKey = crypto.createHash("sha256").update(TEXT_SECRET).digest();

const encryptText = (plainText) => {
  const value = typeof plainText === "string" ? plainText : "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", textKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [
    CIPHER_PREFIX,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

const decryptText = (storedText) => {
  if (typeof storedText !== "string" || !storedText.startsWith(`${CIPHER_PREFIX}:`)) {
    // Not in the encrypted form, so there is nothing to undo.
    return storedText || "";
  }

  const [, iv, authTag, payload] = storedText.split(":");
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      textKey,
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    return (
      decipher.update(Buffer.from(payload, "base64"), undefined, "utf8") +
      decipher.final("utf8")
    );
  } catch (error) {
    // Wrong key or tampered row — don't leak the ciphertext to the client.
    console.error("Failed to decrypt note:", error.message);
    return "";
  }
};

/* ===================== MODELS ===================== */

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  // bcrypt digest — the PIN itself is never stored in a recoverable form.
  pinHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
});
const Room = mongoose.model("Room", roomSchema);

const documentSchema = new mongoose.Schema({
  // Generated per upload, so the display name is free to repeat.
  documentId: { type: String, unique: true, sparse: true },
  roomNumber: { type: String, required: true, index: true },
  documentName: String,
  documentType: String,
  documentSize: Number,
  storagePath: String,
  documentUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", documentSchema);

const noteSchema = new mongoose.Schema({
  // Holds ciphertext. Use `formatNote` to read it.
  text: String,
  roomNumber: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});
const Note = mongoose.model("Note", noteSchema);

/* ===================== ROOM AUTH ===================== */

const ROOM_PATTERN = /^[A-Z0-9-]{3,24}$/;

const normalizeRoomNumber = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

// The client base64-encodes the PIN (btoa) before it leaves the browser.
const decodePin = (encodedPin) => {
  if (typeof encodedPin !== "string" || !encodedPin) return "";
  try {
    return Buffer.from(encodedPin, "base64").toString("utf8");
  } catch {
    return "";
  }
};

// A room number plus a short PIN is guessable, so throttle repeated misses
// per room from the same caller.
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const failedAttempts = new Map();

const attemptKey = (req, roomNumber) => `${req.ip}|${roomNumber}`;

const isLockedOut = (key) => {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
};

const recordFailure = (key) => {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
};

function roomAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Room sign-in required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.roomNumber = payload.room;
    return next();
  } catch {
    return res
      .status(401)
      .json({ error: "Session expired. Please enter your room again." });
  }
}

// POST API: Enter a room. Unknown room numbers are created with the PIN
// supplied, so the first visit doubles as sign-up.
app.post("/room/login", async (req, res) => {
  const roomNumber = normalizeRoomNumber(req.body?.roomNumber);
  const pin = decodePin(req.body?.pin);

  if (!ROOM_PATTERN.test(roomNumber)) {
    return res.status(400).json({
      error: "Room number must be 3-24 letters, digits or hyphens",
    });
  }
  if (pin.length < 4 || pin.length > 32) {
    return res.status(400).json({ error: "PIN must be 4-32 characters" });
  }

  const key = attemptKey(req, roomNumber);
  if (isLockedOut(key)) {
    return res
      .status(429)
      .json({ error: "Too many attempts. Try again in a few minutes." });
  }

  try {
    const room = await Room.findOne({ roomNumber });

    if (!room) {
      await Room.create({
        roomNumber,
        pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS),
      });
    } else {
      const matches = await bcrypt.compare(pin, room.pinHash);
      if (!matches) {
        recordFailure(key);
        return res.status(401).json({ error: "Incorrect room number or PIN" });
      }
      room.lastSeenAt = new Date();
      await room.save();
    }

    failedAttempts.delete(key);
    const token = jwt.sign({ room: roomNumber }, JWT_SECRET, {
      expiresIn: TOKEN_TTL,
    });

    res.json({
      token,
      roomNumber,
      created: !room,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    });
  } catch (error) {
    // A racing first-visit for the same room number trips the unique index.
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "That room was just created. Please try again." });
    }
    console.error("Error entering room:", error.message);
    res.status(500).json({ error: "Failed to enter room" });
  }
});

// GET API: Confirm a stored token is still good (used to guard the tabs)
app.get("/room/session", roomAuth, (req, res) => {
  res.json({ valid: true, roomNumber: req.roomNumber });
});

/* ===================== DOCUMENTS ===================== */

const pad = (value, length = 2) => String(value).padStart(length, "0");

const formatTimestamp = (date) =>
  [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join(":");

// `<name>_<yyyy:mm:dd:hh:mm:ss:ms>`. The client builds this alongside the
// storage path it uploaded to; this is the fallback when it doesn't.
const buildDocumentId = (name, date) => `${name}_${formatTimestamp(date)}`;

const formatDocument = (doc) => ({
  id: doc._id,
  documentId: doc.documentId,
  name: doc.documentName,
  type: doc.documentType,
  url: doc.documentUrl,
  size: doc.documentSize,
  storagePath: doc.storagePath || `uploads/${doc.documentName}`,
  uploadedAt: doc.uploadedAt,
});

// DELETE API: Delete a document in the caller's room by _id or documentId
app.delete("/deletedocument/:id", roomAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    const matchers = [{ documentId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      matchers.push({ _id: id });
    }

    const document = await Document.findOneAndDelete({
      roomNumber: req.roomNumber,
      $or: matchers,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({
      message: "Document deleted successfully",
      storagePath: document.storagePath || `uploads/${document.documentName}`,
    });
  } catch (error) {
    console.error("Error deleting document:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET API: Fetch the caller room's documents
app.get("/fetchdocuments", roomAuth, async (req, res) => {
  try {
    const documents = await Document.find({ roomNumber: req.roomNumber });
    res.json({ documents: documents.map(formatDocument) });
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST API: Upload documents into the caller's room
app.post("/uploaddocument", roomAuth, async (req, res) => {
  const { documents } = req.body;

  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: "No documents provided" });
  }

  try {
    const savedDocuments = await Promise.all(
      documents.map(async (doc) => {
        if (!doc.url) {
          throw new Error("Provide Document url");
        }
        const newDocument = await Document.create({
          documentId: doc.documentId || buildDocumentId(doc.name, new Date()),
          roomNumber: req.roomNumber,
          documentName: doc.name,
          documentType: doc.type,
          documentSize: doc.size,
          storagePath: doc.storagePath,
          documentUrl: doc.url,
        });
        return formatDocument(newDocument);
      })
    );
    res.json({
      message: "Documents uploaded successfully",
      files: savedDocuments,
    });
  } catch (err) {
    console.error("Error uploading documents:", err.message);
    res.status(500).json({ error: "Failed to save documents to the database" });
  }
});

/* ===================== NOTES ===================== */

// Decrypts on the way out, so the UI sees plain text and the DB never does.
const formatNote = (note) => ({
  _id: note._id,
  text: decryptText(note.text),
  createdAt: note.createdAt,
});

// POST API: Create a new note in the caller's room
app.post("/texts", roomAuth, async (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const note = await Note.create({
      text: encryptText(text),
      roomNumber: req.roomNumber,
    });
    res.json({ message: "Note created successfully", note: formatNote(note) });
  } catch (error) {
    console.error("Error creating note:", error.message);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// PUT API: Update an existing note in the caller's room
app.put("/texts/:id", roomAuth, async (req, res) => {
  const { text } = req.body;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const note = await Note.findOneAndUpdate(
      { _id: id, roomNumber: req.roomNumber },
      { text: encryptText(text) },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note updated successfully", note: formatNote(note) });
  } catch (error) {
    console.error("Error updating note:", error.message);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// GET API: Fetch the caller room's notes
app.get("/texts", roomAuth, async (req, res) => {
  try {
    const notes = await Note.find({ roomNumber: req.roomNumber });
    res.json({ texts: notes.map(formatNote) });
  } catch (error) {
    console.error("Error fetching notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// DELETE API: Delete a note in the caller's room
app.delete("/texts/:id", roomAuth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      roomNumber: req.roomNumber,
    });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error.message);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

app.get("/", (req, res) => {
  return res.json("hello i am 3001");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
