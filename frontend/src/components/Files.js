import React, { useEffect, useState, useCallback } from "react";
import Page from "./Page";
import supabase from "./Storage";

const Files = () => {

  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  const handleUpload = async () => {
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
      document.getElementById('file-input').value = '';
      fetchFiles();
    } catch (error) {
      alert("Error uploading file. Check the console for details.");
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
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
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
      <main className="main-content">
        <div className="container">
          {/* Upload Section */}
          <section className="upload-section">
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
                  : "Drop files here or click to browse"
                }
              </div>
              <p className="upload-subtext">
                Support for any file type up to 10MB per file
              </p>
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
                      handleUpload();
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

          {/* Files Grid */}
          <section>
            <h2 className="mb-4">Your Files</h2>
            {uploadedFiles.length > 0 ? (
              <div className="files-grid fade-in-up">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-card card">
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
                    <div className="file-actions">
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
                        onClick={() => handleDelete(file.name)}
                        className="btn btn-danger"
                        title="Delete file"
                      >
                        <i className="bx bx-trash"></i>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="bx bx-folder-open"></i>
                </div>
                <h3 className="empty-title">No files uploaded yet</h3>
                <p className="empty-description">
                  Start by uploading your first file using the upload area above.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default Files;
