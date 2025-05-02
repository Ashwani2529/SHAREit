const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const PORT = 3001;
require("dotenv").config();
app.use(express.json({ limit: "25mb" }));

app.use(
  cors({
    origin: ["https://shareit-lite.netlify.app","http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const documentSchema = new mongoose.Schema({
  documentName: String,
  documentType: String,
  documentSize: Number,
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
    const document = await Document.findByIdAndDelete(req.params.id);
    console.log("Document deleted:", document);
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
    const documents = await Document.find();
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
  const { documents } = req.body; 
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
          documentUrl: doc.url,
        });
        console.log("Document saved:", savedDocuments);
        return {
          id: newDocument._id,
          name: newDocument.documentName,
          type: newDocument.documentType,
          size: newDocument.documentSize,
          url: newDocument.documentUrl, 
          uploadedAt: newDocument.uploadedAt,
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
  createdAt: { type: Date, default: Date.now },
});

const Note = mongoose.model("Note", noteSchema);

// POST API: Create a new note
app.post("/texts", async (req, res) => {
  const { text } = req.body;

  try {
    const note = await Note.create({ text });
    res.json({
      message: "Note created successfully",
      note: {
        id: note._id,
        text: note.text,
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
  const { text } = req.body;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }

  try {
    const note = await Note.findByIdAndUpdate(id, { text }, { new: true });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({
      message: "Note updated successfully",
      note: {
        id: note._id,
        text: note.text,
        createdAt: note.createdAt,
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
    const notes = await Note.find();
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
