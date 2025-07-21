import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image, Video, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { blink } from '@/blink/client'
import { MediaFile } from '@/types'

interface MediaUploaderProps {
  mediaFiles: MediaFile[]
  onMediaChange: (files: MediaFile[]) => void
  maxFiles?: number
  className?: string
}

export default function MediaUploader({ 
  mediaFiles, 
  onMediaChange, 
  maxFiles = 4,
  className = '' 
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (mediaFiles.length + acceptedFiles.length > maxFiles) {
      setUploadError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        // Upload to Blink storage
        const { publicUrl } = await blink.storage.upload(
          file,
          `media/${Date.now()}-${file.name}`,
          { upsert: true }
        )

        const mediaFile: MediaFile = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
          size: file.size
        }

        return mediaFile
      })

      const uploadedFiles = await Promise.all(uploadPromises)
      onMediaChange([...mediaFiles, ...uploadedFiles])
    } catch (error) {
      console.error('Error uploading media:', error)
      setUploadError('فشل في رفع الملفات. حاول مرة أخرى.')
    } finally {
      setUploading(false)
    }
  }, [mediaFiles, onMediaChange, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxFiles: maxFiles - mediaFiles.length,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading || mediaFiles.length >= maxFiles
  })

  const removeMedia = (mediaId: string) => {
    onMediaChange(mediaFiles.filter(file => file.id !== mediaId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      {mediaFiles.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          
          {uploading ? (
            <p className="text-gray-600">جاري الرفع...</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">اسحب الملفات هنا</p>
          ) : (
            <div className="space-y-1">
              <p className="text-gray-600">
                اسحب الصور أو الفيديوهات هنا أو انقر للاختيار
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF, MP4 (حتى 50MB لكل ملف)
              </p>
              <p className="text-xs text-gray-400">
                {mediaFiles.length}/{maxFiles} ملفات
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Media Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaFiles.map((file) => (
            <Card key={file.id} className="relative group">
              <CardContent className="p-2">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {/* File Type Icon */}
                  <div className="absolute bottom-1 left-1">
                    {file.type === 'image' ? (
                      <Image className="h-4 w-4 text-white drop-shadow-lg" />
                    ) : (
                      <Video className="h-4 w-4 text-white drop-shadow-lg" />
                    )}
                  </div>
                </div>
                
                {/* File Info */}
                <div className="mt-2 text-xs text-gray-600">
                  <p className="truncate" title={file.name}>{file.name}</p>
                  <p className="text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}