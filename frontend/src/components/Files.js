import React, { useEffect, useState } from "react";
import Page from "./Page";
import { createClient } from "@supabase/supabase-js";

const Files = () => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { error } = await supabase.storage
          .from("fileshare-bucket")
          .upload(`uploads/${file.name}`, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw error;
        }

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
      //upload to backend
      const response = await fetch("https://multer-3w57.onrender.com/uploaddocument", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documents: uploadedFilesData }),
      });
      if (!response.ok) {
        throw new Error("Failed to upload files to backend");
      }
      await response.json();
      // Clear the file input after upload
      setFiles([]);
      fetchFiles();
    } catch (error) {
      alert(
        "Error uploading file. Check the console for details."
      );
      console.error("Error uploading files to Supabase:", error.message);
    } finally {
      setIsUploading(false);
    }
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

  const handleDelete = async (fileName) => {
    try {
       await supabase.storage
        .from("fileshare-bucket")
        .remove([`uploads/${fileName}`]);

      setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
      // Delete from backend
      const response = await fetch(
        `https://multer-3w57.onrender.com/deletedocument/${fileName}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete file from backend");
      }
      await response.json();
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file from Supabase:", error.message);
    }
  };
  const fetchFiles = async () => {
    try {
      const response = await fetch("https://multer-3w57.onrender.com/fetchdocuments");
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
  useEffect(() => {    
    fetchFiles();
  }, []);

  return (
    <>
      <Page />
      <div style={{ padding: "20px" }}>
        <h2>File Upload</h2>
        <input
          type="file"
          multiple
          onChange={(e) => {
            handleFileChange(e);
          }}
        />
        <button
          onClick={handleUpload}
          disabled={!files.length || isUploading}
          style={{ marginLeft: "10px" }}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>

        <h3>Uploaded Files</h3>
        {uploadedFiles.length > 0 ? (
          <table
            border="1"
            cellPadding="10"
            style={{ marginTop: "20px", width: "100%" }}
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles?.map((file, index) => (
                <tr key={index}>
                  <td>{file.name}</td>
                  <td>{file.type}</td>
                  <td>{file.size} bytes</td>
                  <td>
                    <button
                      onClick={() => handleOpen(file)}
                      style={{ marginRight: "10px" }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      style={{ marginRight: "10px" }}
                    >
                      Download
                    </button>
                    <button onClick={() => handleDelete(file.name)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No files uploaded yet.</p>
        )}
      </div>
    </>
  );
};

export default Files;
