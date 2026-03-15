'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface UploadProps {
  onImageUpload: (file: File) => void
  isGenerating: boolean
}

export default function Upload({ onImageUpload, isGenerating }: UploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0])
    }
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isGenerating
  })

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Your Selfie
      </h2>
      
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors duration-200
          ${isDragActive 
            ? 'border-banana-500 bg-banana-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="text-6xl">📸</div>
          
          {isDragActive ? (
            <p className="text-lg text-banana-600 font-medium">
              Drop your photo here!
            </p>
          ) : (
            <>
              <p className="text-lg text-gray-600">
                Drag & drop your photo here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, WebP • Max 10MB
              </p>
            </>
          )}
          
          {!isDragActive && (
            <button
              type="button"
              className="btn-primary"
              disabled={isGenerating}
            >
              Choose File
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>💡 <strong>Pro Tip:</strong> Use a clear, well-lit selfie for best results</p>
      </div>
    </div>
  )
} 