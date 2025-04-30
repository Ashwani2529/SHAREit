import React, { useEffect, useState } from 'react';
import Page from './Page';

const Files = () => {
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        setFiles(e.target.files);
    };

    const handleUpload = async () => {
        setIsUploading(true);

        try {
            const encodedFiles = await Promise.all(
                Array.from(files).map((file) => encodeFileToBase64(file))
            );

            const response = await fetch('https://multer-3w57.onrender.com/uploaddocument', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documents: encodedFiles }),
            });

            if (!response.ok) {
                throw new Error('Failed to upload files');
            }

            const data = await response.json();
            const uploadedFileList = data.files.map((file) => ({
                name: file.name,
                type: file.type || 'Unknown',
                content: file.b64,
            }));
            setUploadedFiles([...uploadedFiles, ...uploadedFileList]);
            setFiles([]);
        } catch (error) {
            console.error('Error uploading files:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const encodeFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ name: file.name, type: file.type, b64: reader.result });
            reader.onerror = (error) => reject(error);
        });
    };

    const handleDownload = (file) => {
        try {
            // Extract the Base64 content and MIME type
            const base64Data = file.content.split(',')[1]; // Remove the data URL prefix
            const mimeType = file.type;
    
            // Convert Base64 to a binary string
            const binaryString = atob(base64Data);
    
            // Create a Uint8Array from the binary string
            const binaryData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                binaryData[i] = binaryString.charCodeAt(i);
            }
    
            // Create a Blob from the binary data
            const blob = new Blob([binaryData], { type: mimeType });
    
            // Create an object URL from the Blob
            const url = URL.createObjectURL(blob);
    
            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.click();
    
            // Revoke the object URL to free up memory
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handleDelete = (index) => {
        const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(updatedFiles);
    };
useEffect(() => {
    const fetchFiles = async () => {
        try {
            const response = await fetch('https://multer-3w57.onrender.com/fetchdocuments');
            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }

            const data = await response.json();
            const fileList = data.documents.map((file) => ({
                name: file.name,
                type: file.type || 'Unknown',
                content: file.b64
            }));
            setUploadedFiles(fileList);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };
    fetchFiles();
}
, []);
    return (
        <>
            <Page />
            <div style={{ padding: '20px' }}>
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
                    style={{ marginLeft: '10px' }}
                >
                    {isUploading ? 'Uploading...' : 'Upload'}
                </button>

                <h3>Uploaded Files</h3>
                {uploadedFiles.length > 0 ? (
                    <table border="1" cellPadding="10" style={{ marginTop: '20px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uploadedFiles?.map((file, index) => (
                                <tr key={index}>
                                    <td>{file.name}</td>
                                    <td>{file.type}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDownload(file)}
                                            style={{ marginRight: '10px' }}
                                        >
                                            Download
                                        </button>
                                        <button onClick={() => handleDelete(index)}>Delete</button>
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