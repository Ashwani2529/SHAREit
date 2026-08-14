const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();


const app = express();
const PORT = 3001;

// --- Core middleware
app.use(express.json({ limit: "25mb" }));

app.use(
  cors({
    origin: ["https://shareit-lite.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);

function passwordAuth(req, res, next) {
  const providedPassword =
    req.headers["x-access-password"] || req.body?.password;
    //decrypt the password  which was encrypted using btoa in frontend
    const decryptedPassword = providedPassword ? atob(providedPassword) : null;

  if (decryptedPassword && decryptedPassword === process.env.PRIVATE_PASSWORD) {
    return next();
  }

  res.status(401).json({ error: "Unauthorized" });
}

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const documentSchema = new mongoose.Schema({
  // Generated per upload, so the name is free to repeat. Sparse because
  // documents saved before this field existed don't have one.
  documentId: { type: String, unique: true, sparse: true },
  documentName: String,
  documentType: String,
  documentSize: Number,
  storagePath: String,
  isPrivate: { type: Boolean, default: false },
  documentUrl:{type: String, required: true},
  uploadedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", documentSchema);

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
  isPrivate: doc.isPrivate,
});

// DELETE API: Delete a document by its _id or generated documentId
app.delete("/deletedocument/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if(!id){
      return res.status(400).json({ error: "Document ID is required" });
    }

    const matchers = [{ documentId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      matchers.push({ _id: id });
    }

    // Documents saved before ids existed can only be found by name.
    const document =
      (await Document.findOneAndDelete({ $or: matchers })) ||
      (await Document.findOneAndDelete({ documentName: id }));

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

// GET API: Fetch all documents
app.get("/fetchdocuments", async (req, res) => {
  try {
    const documents = (await Document.find()).filter(doc => !doc.isPrivate);
    res.json({ documents: documents.map(formatDocument) });
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//get api to check password
app.get("/checkpassword", async (req, res) => {
  const providedPassword = req.headers["x-access-password"];
  const decryptedPassword = providedPassword ? atob(providedPassword) : null;

  if (decryptedPassword && decryptedPassword === process.env.PRIVATE_PASSWORD) {
    return res.json({ valid: true });
  }
  res.status(401).json({ valid: false });
});

app.get("/fetchprivatedocuments", passwordAuth,async (req, res) => {
  try {
    const documents = await Document.find({ isPrivate: true });
    res.json({ documents: documents.map(formatDocument) });
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
          documentId:
            doc.documentId || buildDocumentId(doc.name, new Date()),
          documentName: doc.name,
          documentType: doc.type,
          documentSize: doc.size,
          storagePath: doc.storagePath,
          isPrivate: isPrivate || false,
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

app.get("/privatetexts", passwordAuth,async (req, res) => {
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
