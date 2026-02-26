'use client';

import { useState } from 'react';

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus(''); // Reset status when a new file is chosen
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('1. Getting secure URL from backend...');

    try {
      // Clean the filename: replace spaces and weird characters with underscores
      const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');

      // Step 1: Ask NestJS for the Presigned URL
      const urlResponse = await fetch('http://localhost:3000/storage/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: safeFileName, // Sending the cleaned name!
          contentType: file.type 
        }),
      });

      // Better Error Handling: Catch the exact message from NestJS
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        const errorMessage = Array.isArray(errorData.message) 
          ? errorData.message.join(', ') 
          : errorData.message || 'Unknown backend error';
        throw new Error(`Backend rejected it: ${errorMessage}`);
      }

      const { uploadUrl } = await urlResponse.json();
      setStatus('2. Uploading directly to MinIO...');

      // Step 2: Upload the file directly to MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (uploadResponse.ok) {
        setStatus('✅ Upload completely successful!');
        setFile(null);
      } else {
        throw new Error('Failed to upload file to storage.');
      }
    } catch (error: any) {
      console.error(error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Upload Document
      </h2>
      
      <input 
        type="file" 
        accept="application/pdf, image/jpeg, image/png" 
        onChange={handleFileChange} 
        className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
      />
      
      <button 
        onClick={handleUpload} 
        disabled={!file || isUploading}
        className="flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </button>

      {status && (
        <div className="rounded-lg bg-zinc-50 p-4 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {status}
        </div>
      )}
    </div>
  );
}