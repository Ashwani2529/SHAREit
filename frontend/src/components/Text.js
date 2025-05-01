import React, { useState, useEffect } from "react";
import Page from "./Page";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

const TextManager = () => {
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [modalInputValue, setModalInputValue] = useState(""); // State for modal input

  // Fetch all text items from the backend
  const fetchItems = async () => {
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
    }
  };

  // Add or update a text item
  const handleAddOrUpdate = React.useCallback(async () => {
    if (editIndex !== null) {
      // Update existing item
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
        setShowModal(false); // Close the modal after updating
      } catch (error) {
        console.error("Error updating item:", error);
      }
    } else {
      // Add new item
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
      } catch (error) {
        console.error("Error adding item:", error);
      }
    }
    setInputValue("");
  }, [editIndex, items, modalInputValue, inputValue]);

  // Delete a text item
  const handleDelete = async (id) => {
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
      setItems(items.filter((item) => item._id !== id)); // Filter out the deleted item
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Open the modal for editing
  const handleEdit = (id,index) => {
    setEditIndex(id);
    setModalInputValue(items[index].text); // Set the current text in the modal input
    setShowModal(true); // Show the modal
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditIndex(null);
  };

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <>
      <Page />
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <h2>Text Manager</h2>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter text or link"
            style={{ padding: "5px", width: "70%" }}
          />
          <button
            onClick={handleAddOrUpdate}
            style={{ padding: "5px 10px", marginLeft: "10px" }}
          >
            {editIndex !== null ? "Update" : "Add"}
          </button>
        </div>
        <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Text/Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item?._id}>
                <td>{item?.text || null}</td> 
                <td>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item?.text || "");
                    }}
                    style={{ marginRight: "5px" }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleEdit(item._id,index)} // Use _id for editing
                    style={{ marginRight: "5px" }}
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item._id)}>Delete</button>{" "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for editing */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Text</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            value={modalInputValue}
            onChange={(e) => setModalInputValue(e.target.value)}
            style={{ width: "100%", padding: "5px" }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleAddOrUpdate}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TextManager;
