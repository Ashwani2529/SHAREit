import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import Page from "./Page";
import supabase from "./Storage";
import { TopProgressBar, SkeletonCards } from "./Loader";
import { buildIdentities } from "../utils/fileIdentity";

const Files = () => {

  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
      // Each file goes to its own generated path, so re-uploading a name that
      // already exists is fine. The file itself is sent as-is — no resizing,
      // no compression.
      const uploadPromises = buildIdentities(files).map(
        async ({ file, documentId, storagePath }) => {
          const { error } = await supabase.storage
            .from("fileshare-bucket")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });

          if (error) {
            throw error;
          }

          const { data: publicUrlData } = supabase.storage
            .from("fileshare-bucket")
            .getPublicUrl(storagePath);

          return {
            documentId,
            storagePath,
            name: file.name,
            type: file.type,
            url: publicUrlData.publicUrl,
            size: file.size,
          };
        }
      );
      
      const uploadedFilesData = await Promise.all(uploadPromises);

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

      // Show the saved records, so every new card already carries its id
      const saved = await response.json();
      setUploadedFiles((prev) => [...prev, ...(saved.files || [])]);
      // Clear the file input after upload
      setFiles([]);
      document.getElementById('file-input').value = '';
      toast.success("File(s) uploaded successfully");
      fetchFiles();
    } catch (error) {
      toast.error("Error uploading file. Check the console for details.");
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

  const handleDelete = async (file) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await supabase.storage
        .from("fileshare-bucket")
        .remove([file.storagePath || `uploads/${file.name}`]);

      setUploadedFiles((prev) => prev.filter((item) => item.id !== file.id));

      // Delete from backend by id, so same-named files stay independent
      const response = await fetch(
        `https://multer-3w57.onrender.com/deletedocument/${encodeURIComponent(file.id)}`,
        {
          method: "DELETE",
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to delete file from backend");
      }
      
      await response.json();
      toast.success("File deleted");
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file from Supabase:", error.message);
      toast.error("Failed to delete file.");
    }
  };

  const fetchFiles = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("https://multer-3w57.onrender.com/fetchdocuments");
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      const fileList = data.documents.map((file) => ({
        id: file.id,
        documentId: file.documentId,
        storagePath: file.storagePath,
        name: file.name,
        type: file.type || "Unknown",
        url: file.url,
        size: file.size,
      }));
      setUploadedFiles(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Couldn't load your files. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <>
      <TopProgressBar active={isFetching || isUploading} />
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
                Any file type, stored at its original size — duplicate names are fine
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
            {isFetching && uploadedFiles.length === 0 ? (
              <SkeletonCards count={6} />
            ) : uploadedFiles.length > 0 ? (
              <div className="files-grid fade-in-up">
                {uploadedFiles.map((file, index) => (
                  <div key={file.id || file.documentId || index} className="file-card card">
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
                        onClick={() => handleDelete(file)}
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
