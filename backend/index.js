const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const PORT = 3001;

// --- Core middleware
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["https://shareit-lite.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);

const isProd = process.env.NODE_ENV === "production";
if (isProd) app.set("trust proxy", 1);

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
    cookie: {
      httpOnly: true,
      secure: isProd, 
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 8,
    }
  })
);

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const ok = password && password === process.env.PRIVATE_PASSWORD;
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // Prevent session fixation and ensure it gets saved to the store
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Session regen failed" });

    // Put *something* on the session so it is non-empty and persists
    req.session.authenticated = true;
    req.session.issuedAt = Date.now();

    req.session.save(err2 => {
      if (err2) return res.status(500).json({ error: "Session save failed" });
      res.json({ ok: true });
    });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});


// --- Who am I? boolean only
app.get("/api/me", (req, res) => {
  // Fast path: if session object exists and we set our flag earlier, it's true.
  // (This works when the store entry is loaded and not stale.)
  if (req.session && req.session.authenticated) {
    return res.json({ user: true });
  }

  // Slow path: explicitly check the store to detect stale cookies.
  const sid = req.sessionID;
  if (!sid) return res.json({ user: false });

  req.sessionStore.get(sid, (err, sess) => {
    if (err) {
      // On store error, treat as unauthenticated
      return res.json({ user: false });
    }

    if (!sess || !sess.authenticated) {
      // Stale cookie: clear it so the client stops sending a dead SID
      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("sid", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
      });
      return res.json({ user: false });
    }

    res.json({ user: true });
  });
});
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const documentSchema = new mongoose.Schema({
  documentName: String,
  documentType: String,
  documentSize: Number,
  isPrivate: { type: Boolean, default: false },
  documentUrl:{type: String, required: true}, 
  uploadedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", documentSchema);

// DELETE API: Delete a document by ID
app.delete("/deletedocument/:id", async (req, res) => {
  try {
    if(!req.params.id){
      return res.status(400).json({ error: "Document ID is required" });
    }
    const document = await Document.deleteOne({ documentName: (req.params.id).toString() });
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET API: Fetch all documents
app.get("/fetchdocuments", async (req, res) => {
  try {
    const documents = (await Document.find()).filter(doc => !doc.isPrivate);
    const formattedDocuments = documents.map((doc) => ({
      id: doc._id,
      name: doc.documentName,
      type: doc.documentType,
      url: doc.documentUrl, 
      size: doc.documentSize,
      uploadedAt: doc.uploadedAt,
    }));
    res.json({ documents: formattedDocuments });
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/fetchprivatedocuments", async (req, res) => {
  try {
    const documents = await Document.find({ isPrivate: true });
    const formattedDocuments = documents.map((doc) => ({
      id: doc._id,
      name: doc.documentName,
      type: doc.documentType,
      url: doc.documentUrl, 
      size: doc.documentSize,
      uploadedAt: doc.uploadedAt,
    }));
    res.json({ documents: formattedDocuments });
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
// POST API: Upload a document
app.post("/uploaddocument", async (req, res) => {
  const { documents, isPrivate } = req.body;
  try {
    const savedDocuments = await Promise.all(
      documents.map(async (doc) => {
        if (!doc.url) {
          throw new Error("Provide Document url");
        }
        const newDocument = await Document.create({
          documentName: doc.name,
          documentType: doc.type,
          documentSize: doc.size,
          isPrivate: isPrivate || false,
          documentUrl: doc.url,
        });
        return {
          id: newDocument._id,
          name: newDocument.documentName,
          type: newDocument.documentType,
          size: newDocument.documentSize,
          url: newDocument.documentUrl, 
          uploadedAt: newDocument.uploadedAt,
          isPrivate: newDocument.isPrivate,
        };
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
const noteSchema = new mongoose.Schema({
  text: String,
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Note = mongoose.model("Note", noteSchema);

// POST API: Create a new note
app.post("/texts", async (req, res) => {
  const { text, isPrivate } = req.body;

  try {
    const note = await Note.create({ text, isPrivate });
    res.json({
      message: "Note created successfully",
      note: {
        id: note._id,
        text: note.text,
        isPrivate: note.isPrivate,
        createdAt: note.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating note:", error.message);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// PUT API: Update an existing note

app.put("/texts/:id", async (req, res) => {
  const { text, isPrivate } = req.body;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }

  try {
    const note = await Note.findByIdAndUpdate(id, { text, isPrivate }, { new: true });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({
      message: "Note updated successfully",
      note: {
        id: note._id,
        text: note.text,
        createdAt: note.createdAt,
        isPrivate: note.isPrivate,
      },
    });
  } catch (error) {
    console.error("Error updating note:", error.message);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// GET API: Fetch all notes
app.get("/texts", async (req, res) => {
  try {
    const notes = (await Note.find()).filter(note => !note.isPrivate);
    res.json({ texts: notes });
  } catch (error) {
    console.error("Error fetching notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/privatetexts", async (req, res) => {
  try {
    const notes = await Note.find({ isPrivate: true });
    res.json({ texts: notes });
  } catch (error) {
    console.error("Error fetching notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// DELETE API: Delete a note by ID
app.delete("/texts/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
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
