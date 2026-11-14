import React, { useState } from 'react';
import { validateImageFile } from '../../utils/imageUploadHelpers';
import { optimizeUploadedImage } from '../../utils/imageCompression';

export interface ProductImageUploaderProps {
  onImageConverted?: (base64String: string, fileName?: string) => void;
  maxSizeBytes?: number;
  title?: string;
  className?: string;
}

export default function ProductImageUploader({
  onImageConverted,
  maxSizeBytes = 2 * 1024 * 1024,
  title = 'Upload Product Image',
  className = '',
}: ProductImageUploaderProps) {
  const [imageBase64, setImageBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size and format
    const validation = validateImageFile(file, maxSizeBytes);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError('');
    setFileName(file.name);

    optimizeUploadedImage(file, {
      maxDimension: 1200,
      maxDataUrlLength: 320_000,
      initialQuality: 0.84,
    })
      .then((base64String) => {
        setImageBase64(base64String);
        if (onImageConverted) {
          onImageConverted(base64String, file.name);
        }
      })
      .catch((err) => {
        console.error('Image optimization error:', err);
        setError('Failed to read the image file.');
      });
  };

  const handleRemove = () => {
    setImageBase64('');
    setFileName('');
    setError('');
  };

  return (
    <div className={`p-4 bg-white dark:bg-[#111A2E] rounded-2xl shadow-xs border border-[#DCE5F0] dark:border-[#1E293B] space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">{title}</h3>
        <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">Max 2MB (PNG, JPG, WebP)</span>
      </div>

      <label className="block">
        <span className="sr-only">Choose product image</span>
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleImageChange}
          className="block w-full text-xs text-gray-500 dark:text-slate-400
            file:mr-3 file:py-2 file:px-3.5
            file:rounded-xl file:border-0
            file:text-xs file:font-bold
            file:bg-neutral-900 dark:file:bg-neutral-800 file:text-white
            hover:file:bg-neutral-800 dark:hover:file:bg-neutral-700 cursor-pointer transition-colors"
        />
      </label>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      {imageBase64 && (
        <div className="space-y-2 pt-1 border-t border-[#DCE5F0] dark:border-[#1E293B]">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="truncate max-w-[200px] font-mono text-[11px]">{fileName}</span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:underline font-bold text-xs cursor-pointer"
            >
              Remove
            </button>
          </div>
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] bg-gray-50 dark:bg-black/20">
            <img src={imageBase64} alt="Product Preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
