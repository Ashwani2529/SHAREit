import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Page from "./Page";
import AppModal from "./AppModal";
import { TopProgressBar, SkeletonCards } from "./Loader";

const TextManager = () => {
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalInputValue, setModalInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch all text items from the backend
  const fetchItems = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("https://multer-3w57.onrender.com/texts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = await response.json();
      setItems(data.texts || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Couldn't load your texts. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  // Add or update a text item
  const handleAddOrUpdate = React.useCallback(async () => {
    if (editIndex !== null) {
      // Update existing item
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://multer-3w57.onrender.com/texts/${editIndex}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: modalInputValue }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to update item");
        }
        const updatedItems = [...items];
        updatedItems[editIndex] = { ...updatedItems[editIndex], text: modalInputValue };
        setItems(updatedItems);
        setEditIndex(null);
        setShowModal(false);
        toast.success("Text updated");
        fetchItems();
      } catch (error) {
        console.error("Error updating item:", error);
        toast.error("Failed to update text.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Add new item
      if (!inputValue.trim()) return;

      setIsLoading(true);
      try {
        const response = await fetch("https://multer-3w57.onrender.com/texts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: inputValue }),
        });
        if (!response.ok) {
          throw new Error("Failed to add item");
        }
        const data = await response.json();
        setItems([...items, data.text]);
        toast.success("Text added");
        fetchItems();
      } catch (error) {
        console.error("Error adding item:", error);
        toast.error("Failed to add text.");
      } finally {
        setIsLoading(false);
      }
    }
    setInputValue("");
  }, [editIndex, items, modalInputValue, inputValue]);

  // Delete a text item
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this text?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`https://multer-3w57.onrender.com/texts/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
      setItems(items.filter((item) => item._id !== id));
      toast.success("Text deleted");
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete text.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy text:", error);
      toast.error("Couldn't copy to clipboard.");
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

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <>
      <TopProgressBar active={isFetching || isLoading} />
      <Page />
      <main className="main-content">
        <div className="container">
          {/* Add Text Form */}
          <section className="mb-5">
            <h2 className="mb-4">Text Manager</h2>
            <div className="input-form">
              <div className="input-group">
                <label htmlFor="text-input" className="input-label">
                  Add new text or link
                </label>
                <input
                  style={{ width: '100%' }}
                  id="text-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter text, URL, or any content you want to save..."
                  className="form-control"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddOrUpdate();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleAddOrUpdate}
                disabled={!inputValue.trim() || isLoading}
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
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

          {/* Text Cards Grid */}
          <section>
            <h3 className="mb-4">Saved Texts ({items.length})</h3>
            {isFetching && items.length === 0 ? (
              <SkeletonCards count={6} />
            ) : items.length > 0 ? (
              <div className="text-cards fade-in-up">
                {items.map((item, index) => {
                  const preview = getTextPreview(item?.text || '');
                  return (
                    <div key={item?._id} className="text-card card">
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
                      <div className="text-actions">
                        <button
                          onClick={() => handleCopy(item?.text)}
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
                          onClick={() => handleEdit(item._id, index)}
                          className="btn btn-ghost"
                          title="Edit text"
                        >
                          <i className="bx bx-edit"></i>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
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
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="bx bx-text"></i>
                </div>
                <h3 className="empty-title">No texts saved yet</h3>
                <p className="empty-description">
                  Start by adding your first text or link using the form above.
                  You can save URLs, notes, code snippets, or any text content.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Edit Modal */}
      <AppModal
        show={showModal}
        onClose={handleCloseModal}
        title="Edit Text"
        icon={<i className="bx bx-edit"></i>}
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-outline"
            >
              <i className="bx bx-x"></i>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddOrUpdate}
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
            </button>
          </>
        }
      >
        <div className="input-group">
          <label htmlFor="modal-text-input" className="input-label">
            Text Content
          </label>
          <textarea
            id="modal-text-input"
            value={modalInputValue}
            onChange={(e) => setModalInputValue(e.target.value)}
            className="form-control"
            placeholder="Enter your text content..."
          />
        </div>
      </AppModal>
    </>
  );
};

export default TextManager;
