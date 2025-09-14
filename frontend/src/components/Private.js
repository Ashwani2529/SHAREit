import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Page from "./Page";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import supabase from "./Storage";

const Private = () => {

  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
    const [items, setItems] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalInputValue, setModalInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
 // Fetch all text items from the backend
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://multer-3w57.onrender.com/privatetexts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-password": localStorage.getItem("privatePassword") || ""
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = await response.json();
      setItems(data.texts || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

const handleSubmit = async (type) => {
  if (type === "file") {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { error } = await supabase.storage
          .from("fileshare-bucket")
          .upload(`uploads/${file.name}`, file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from("fileshare-bucket")
          .getPublicUrl(`uploads/${file.name}`);

        return {
          name: file.name,
          type: file.type,
          url: publicUrlData.publicUrl,
          size: file.size,
        };
      });

      const uploadedFilesData = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...uploadedFilesData]);

      // Save metadata to backend
      const response = await fetch(
        "https://multer-3w57.onrender.com/uploaddocument",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: uploadedFilesData, isPrivate: true }),
        }
      );
      if (!response.ok) throw new Error("Failed to upload files to backend");
      await response.json();

      // Clear file input & refresh
      setFiles([]);
      const inputEl = document.getElementById("file-input");
      if (inputEl) inputEl.value = "";
      fetchFiles();
    } catch (error) {
      alert("Error uploading file. Check the console for details.");
      console.error("Error uploading files to Supabase:", error.message);
    } finally {
      setIsUploading(false);
    }

  } else if (type === "text") {
    // Add or update text (depends on editIndex just like your current code)
    if (editIndex !== null) {
      // UPDATE
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://multer-3w57.onrender.com/texts/${editIndex}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: modalInputValue, isPrivate: true }),
          }
        );
        if (!response.ok) throw new Error("Failed to update item");

        const updated = [...items];
        updated[editIndex] = { ...updated[editIndex], text: modalInputValue };
        setItems(updated);

        setEditIndex(null);
        setShowModal(false);
        fetchItems();
      } catch (error) {
        console.error("Error updating item:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // ADD
      if (!inputValue.trim()) return;

      setIsLoading(true);
      try {
        const response = await fetch("https://multer-3w57.onrender.com/texts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputValue, isPrivate: true }),
        });
        if (!response.ok) throw new Error("Failed to add item");

        const data = await response.json();
        setItems([...items, data.text]);
        fetchItems();
      } catch (error) {
        console.error("Error adding item:", error);
      } finally {
        setIsLoading(false);
      }
    }

    setInputValue("");
  }
};


const handleDelete = async (idOrFileName, type) => {
  if (!window.confirm('Are you sure you want to delete this?')) return;

  setIsLoading(true);

  try {
    if (type === "file") {
      // Delete file from Supabase
      await supabase.storage
        .from("fileshare-bucket")
        .remove([`uploads/${idOrFileName}`]);

      // Update local state
      setUploadedFiles((prev) => prev.filter((file) => file.name !== idOrFileName));

      // Delete file record from backend
      const response = await fetch(
        `https://multer-3w57.onrender.com/deletedocument/${idOrFileName}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file from backend");
      }

      await response.json();
      fetchFiles();
    } else if (type === "text") {
      // Delete text from backend
      const response = await fetch(`https://multer-3w57.onrender.com/texts/${idOrFileName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete text item");
      }

      // Update local state
      setItems((prev) => prev.filter((item) => item._id !== idOrFileName));
      fetchItems();
    }
  } catch (error) {
    console.error("Error deleting item:", error.message);
  } finally {
    setIsLoading(false);
  }
};


  // Copy text to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  // Open the modal for editing
  const handleEdit = (id, index) => {
    setEditIndex(id);
    setModalInputValue(items[index].text);
    setShowModal(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditIndex(null);
    setModalInputValue("");
  };

  // Check if text is a URL
  const isURL = (text) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  // Truncate text for display
  const truncateText = (text, maxLength = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get preview of text content
  const getTextPreview = (text) => {
    if (isURL(text)) {
      return { type: 'url', content: text, display: text };
    }
    return { type: 'text', content: text, display: truncateText(text) };
  };
useEffect(() => {
  const password = localStorage.getItem("privatePassword");
  if (!password) {
    setError("No password found. Please log in.");
    navigate("/login");
    return;
  }

  async function checkPasswordAndFetch() {
    try {
      const res = await fetch("https://multer-3w57.onrender.com/checkpassword", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-password": password
        }
      });

      if (!res.ok) {
        navigate("/login");
        throw new Error("Invalid password");
      }

      const data = await res.json();
      if (data.valid) {
        fetchItems();
        fetchFiles();
      } else {
        throw new Error("Invalid password");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  checkPasswordAndFetch();
  // eslint-disable-next-line
}, []);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    setFiles(droppedFiles);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type?.includes('image')) return 'bx-image';
    if (type?.includes('video')) return 'bx-video';
    if (type?.includes('audio')) return 'bx-music';
    if (type?.includes('pdf')) return 'bx-file-blank';
    if (type?.includes('text')) return 'bx-file-doc';
    if (type?.includes('zip') || type?.includes('rar')) return 'bx-archive';
    return 'bx-file';
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error("Failed to fetch file for download");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file from Supabase:", error.message);
    }
  };

  const handleOpen = async (file) => {
    window.open(file.url, "_blank");
  };
  const fetchFiles = async () => {
    try {
      const response = await fetch("https://multer-3w57.onrender.com/fetchprivatedocuments", {
        method: "GET",
        headers: {
          "x-access-password": localStorage.getItem("privatePassword") || ""
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      const fileList = data.documents.map((file) => ({
        name: file.name,
        type: file.type || "Unknown",
        url: file.url,
        size: file.size,
      }));
      setUploadedFiles(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };
if (error) return <div>{error}</div>;
  return (
    <>
  <Page />
  <div className="flex" style={{ gap: "1rem" }}>
    <main className="main-content" style={{ width: "100%" }}>
      <div className="container">

        {/* ⬆️ Top Row: Upload Files (left) + Add Text (right) */}
        <div className="top-row" style={{ display: "flex", gap: "1rem", alignItems: "stretch" }}>
          {/* Upload */}
          <section className="upload-section" style={{ flex: 1 }}>
            <div
              className={`upload-card ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <div className="upload-icon">
                <i className="bx bx-cloud-upload"></i>
              </div>
              <div className="upload-text">
                {files && files.length > 0
                  ? `${files.length} file(s) selected`
                  : "Drop files here or click to browse"}
              </div>
              <p className="upload-subtext">Support for any file type up to 10MB per file</p>

              <div className="upload-actions">
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="file-input"
                  aria-label="Choose files to upload"
                />
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('file-input').click();
                  }}
                >
                  <i className="bx bx-folder-open"></i>
                  Browse Files
                </button>
                {files && files.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubmit("file");
                    }}
                    disabled={isUploading}
                    className={`btn btn-primary ${isUploading ? 'loading' : ''}`}
                  >
                    {isUploading ? (
                      <>
                        <span className="spinner"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-upload"></i>
                        Upload {files.length} file(s)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Add / Edit Text */}
          <section className="text-input-section" style={{ flex: 1 }}>
            <h2 className="mb-4">Text Manager</h2>
            <div className="input-form" style={{display:'block'}}>
              <div className="input-group">
                <label htmlFor="text-input" className="input-label">Add new text or link</label>
                <input
                  style={{ width: '100%' }}
                  id="text-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter text, URL, or any content you want to save..."
                  className="form-control"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSubmit("text");
                  }}
                />
              </div>
              <button
                onClick={handleSubmit.bind(null, "text")}
                disabled={!inputValue.trim() || isLoading}
                className={`mt-4 btn btn-primary ${isLoading ? 'loading' : ''}`}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bx bx-plus"></i>
                    Add Text
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* ⬇️ Mixed Grid: Files + Texts together */}
        <section style={{ marginTop: "2rem" }}>
          <h2 className="mb-4">Your Stuff ({uploadedFiles.length + items.length})</h2>

          {(() => {
            // normalize into a single mixed array
            const mergedItems = [
              ...uploadedFiles.map((file) => ({ kind: 'file', id: file.name, file })),
              ...items.map((t) => ({ kind: 'text', id: t?._id, text: t })),
            ];

            return mergedItems.length > 0 ? (
              <div className="mixed-grid fade-in-up">
                {mergedItems.map((m, index) => {
                  if (m.kind === 'file') {
                    const file = m.file;
                    return (
                      <div key={`file-${file.name}-${index}`} className="card mixed-card">
                        <div className="file-info">
                          <div className="file-name">
                            <i className={`bx ${getFileIcon(file.type)}`}></i>
                            {file.name}
                          </div>
                          <div className="file-meta">
                            <span className="file-type">{file.type || 'Unknown'}</span>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <div className="mixed-actions">
                          <button
                            onClick={() => handleOpen(file)}
                            className="btn btn-outline"
                            title="Open file"
                          >
                            <i className="bx bx-show"></i>
                            Open
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="btn btn-secondary"
                            title="Download file"
                          >
                            <i className="bx bx-download"></i>
                            Download
                          </button>
                          <button
                            onClick={() => handleDelete(file.name, "file")}
                            className="btn btn-danger"
                            title="Delete file"
                          >
                            <i className="bx bx-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    const t = m.text;
                    const preview = getTextPreview(t?.text || '');
                    return (
                      <div key={`text-${t?._id}-${index}`} className="card mixed-card">
                        <div className="text-content">
                          {preview.type === 'url' ? (
                            <a
                              href={preview.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                            >
                              <i className="bx bx-link-external"></i>
                              {preview.display}
                            </a>
                          ) : (
                            <span>{preview.display}</span>
                          )}
                        </div>
                        <div className="mixed-actions">
                          <button
                            onClick={() => handleCopy(t?.text)}
                            className="btn btn-outline"
                            title="Copy to clipboard"
                          >
                            <i className="bx bx-copy"></i>
                            Copy
                          </button>
                          {preview.type === 'url' && (
                            <button
                              onClick={() => window.open(preview.content, '_blank')}
                              className="btn btn-secondary"
                              title="Open link"
                            >
                              <i className="bx bx-link-external"></i>
                              Open
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(t._id, index)}
                            className="btn btn-ghost"
                            title="Edit text"
                          >
                            <i className="bx bx-edit"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(t._id, "text")}
                            className="btn btn-danger"
                            title="Delete text"
                            disabled={isLoading}
                          >
                            <i className="bx bx-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="bx bx-box"></i>
                </div>
                <h3 className="empty-title">Nothing here yet</h3>
                <p className="empty-description">
                  Upload a file or add a text using the inputs above.
                </p>
              </div>
            );
          })()}
        </section>
      </div>
    </main>

    {/* Edit Modal (unchanged) */}
    <Modal show={showModal} onHide={handleCloseModal} centered className="custom-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title>
          <i className="bx bx-edit"></i>
          Edit Text
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-custom">
        <div className="input-group">
          <label htmlFor="modal-text-input" className="input-label">Text Content</label>
          <textarea
            id="modal-text-input"
            value={modalInputValue}
            onChange={(e) => setModalInputValue(e.target.value)}
            className="form-control"
            rows="4"
            placeholder="Enter your text content..."
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="modal-footer-custom">
        <Button variant="outline-secondary" onClick={handleCloseModal} className="btn btn-outline">
          <i className="bx bx-x"></i>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit.bind(null, "text")}
          disabled={!modalInputValue.trim() || isLoading}
          className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-check"></i>
              Save Changes
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  </div>

  {/* Styles (additions for mixed grid/cards) */}
  <style>{`
    .mixed-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-md);
    }
    .mixed-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--space-sm);
    }
    .mixed-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }
    .top-row .upload-card {
      height: 100%;
      cursor: pointer;
    }
  `}</style>
</>

  );
};

export default Private;
