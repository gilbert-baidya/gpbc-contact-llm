import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Loader } from 'lucide-react';
import { uploadFile } from '../services/googleAppsScriptService';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFileUploaded: (mediaUrl: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUploaded, 
  onRemove,
  disabled = false 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Drag event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploaded) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploaded) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Step 6: Unified file processing with validation
  const processFile = async (file: File) => {
    // PART 6: Validate file type - Support JPEG, PNG, PDF, HEIF
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'application/pdf',
      'image/heif',
      'image/heic',
      'image/heif-sequence',
      'image/heic-sequence'
    ];
    
    // Also check file extension for HEIF/HEIC (some browsers don't report correct MIME)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'heif', 'heic'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt || '')) {
      toast.error('Only JPEG, PNG, PDF, and HEIF files are allowed');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Auto-upload the file
    await handleUpload(file);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const result = await uploadFile(file);
      
      if (result.success && result.mediaUrl) {
        setUploaded(true);
        toast.success(`${file.name} uploaded successfully!`);
        onFileUploaded(result.mediaUrl);
      } else {
        toast.error(result.error || 'Upload failed');
        handleClear();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
      handleClear();
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  const handleClick = () => {
    if (!disabled && !uploaded) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading || uploaded}
      />

      {/* Upload Button or Preview */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`w-full px-4 py-6 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isDragging ? (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-blue-600 font-semibold">
                Drop file here to upload
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-700 font-medium mb-1">
                Drag & drop invitation image here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                JPEG, PNG, or PDF (Max 5MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
          {/* Preview */}
          <div className="flex items-start space-x-3">
            {/* Icon or Image Preview */}
            <div className="flex-shrink-0">
              {preview ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              
              {/* Status */}
              {uploading && (
                <div className="flex items-center space-x-2 mt-2 text-blue-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Uploading...</span>
                </div>
              )}
              {uploaded && (
                <div className="flex items-center space-x-2 mt-2 text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs">Uploaded successfully</span>
                </div>
              )}
            </div>

            {/* Remove Button */}
            {!uploading && (
              <button
                onClick={handleClear}
                className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        📎 Attach media to send MMS instead of SMS
      </p>
    </div>
  );
};
