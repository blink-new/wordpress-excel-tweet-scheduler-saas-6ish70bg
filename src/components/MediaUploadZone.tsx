import React, { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Alert, AlertDescription } from './ui/alert'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'
import {
  Upload,
  X,
  Image,
  Video,
  Music,
  File,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface MediaFile {
  id: string
  file: File
  url?: string
  type: 'image' | 'video' | 'audio' | 'document'
  uploadProgress: number
  uploaded: boolean
  error?: string
}

interface MediaUploadZoneProps {
  onMediaUploaded: (mediaUrls: string[]) => void
  maxFiles?: number
  maxSizePerFile?: number // in MB
  acceptedTypes?: string[]
  className?: string
}

export default function MediaUploadZone({
  onMediaUploaded,
  maxFiles = 4,
  maxSizePerFile = 10,
  acceptedTypes = ['image/*', 'video/*', 'audio/*'],
  className = ''
}: MediaUploadZoneProps) {
  const { toast } = useToast()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Determine file type
  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
  }

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5" />
      case 'video':
        return <Video className="w-5 h-5" />
      case 'audio':
        return <Music className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const newFiles: MediaFile[] = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: getFileType(file),
      uploadProgress: 0,
      uploaded: false
    }))

    // Check file size
    const oversizedFiles = newFiles.filter(f => f.file.size > maxSizePerFile * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast({
        title: "حجم الملف كبير",
        description: `الحد الأقصى لحجم الملف هو ${maxSizePerFile} ميجابايت`,
        variant: "destructive"
      })
      return
    }

    // Check total files limit
    if (mediaFiles.length + newFiles.length > maxFiles) {
      toast({
        title: "عدد الملفات كبير",
        description: `يمكنك رفع حتى ${maxFiles} ملفات فقط`,
        variant: "destructive"
      })
      return
    }

    setMediaFiles(prev => [...prev, ...newFiles])
  }, [mediaFiles.length, maxFiles, maxSizePerFile, toast])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // Upload files to storage
  const uploadFiles = async () => {
    if (mediaFiles.length === 0) return

    try {
      setUploading(true)
      const uploadedUrls: string[] = []

      for (const mediaFile of mediaFiles) {
        if (mediaFile.uploaded) {
          uploadedUrls.push(mediaFile.url!)
          continue
        }

        try {
          // Update progress
          setMediaFiles(prev => prev.map(f => 
            f.id === mediaFile.id 
              ? { ...f, uploadProgress: 50 }
              : f
          ))

          // Upload to Blink storage
          const { publicUrl } = await blink.storage.upload(
            mediaFile.file,
            `media/${Date.now()}-${mediaFile.file.name}`,
            {
              upsert: true,
              onProgress: (percent) => {
                setMediaFiles(prev => prev.map(f => 
                  f.id === mediaFile.id 
                    ? { ...f, uploadProgress: percent }
                    : f
                ))
              }
            }
          )

          // Mark as uploaded
          setMediaFiles(prev => prev.map(f => 
            f.id === mediaFile.id 
              ? { ...f, url: publicUrl, uploaded: true, uploadProgress: 100 }
              : f
          ))

          uploadedUrls.push(publicUrl)

        } catch (error) {
          console.error('Failed to upload file:', error)
          setMediaFiles(prev => prev.map(f => 
            f.id === mediaFile.id 
              ? { ...f, error: 'فشل في الرفع', uploadProgress: 0 }
              : f
          ))
        }
      }

      // Notify parent component
      onMediaUploaded(uploadedUrls)

      toast({
        title: "تم الرفع",
        description: `تم رفع ${uploadedUrls.length} ملف بنجاح`
      })

    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: "خطأ",
        description: "فشل في رفع الملفات",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Remove file
  const removeFile = (fileId: string) => {
    setMediaFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Clear all files
  const clearAllFiles = () => {
    setMediaFiles([])
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (!uploading) {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.accept = acceptedTypes.join(',')
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement
              handleFileSelect(target.files)
            }
            input.click()
          }
        }}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {dragActive ? (
          <p className="text-primary">اسحب الملفات هنا...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              اسحب الملفات هنا أو انقر للاختيار
            </p>
            <p className="text-sm text-gray-500">
              الصور، الفيديو، الصوت (حتى {maxSizePerFile} ميجابايت لكل ملف)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {mediaFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">الملفات المرفقة ({mediaFiles.length})</h4>
            <div className="flex gap-2">
              {!uploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  className="text-red-600 hover:text-red-700"
                >
                  حذف الكل
                </Button>
              )}
              <Button
                onClick={uploadFiles}
                disabled={uploading || mediaFiles.every(f => f.uploaded)}
                size="sm"
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'جاري الرفع...' : 'رفع الملفات'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {mediaFiles.map((mediaFile) => (
              <div key={mediaFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getFileIcon(mediaFile.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {mediaFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(mediaFile.file.size / 1024 / 1024).toFixed(2)} ميجابايت
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  {mediaFile.uploaded ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">تم الرفع</span>
                    </div>
                  ) : mediaFile.error ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">{mediaFile.error}</span>
                    </div>
                  ) : mediaFile.uploadProgress > 0 ? (
                    <div className="flex-1">
                      <Progress value={mediaFile.uploadProgress} className="h-2" />
                      <span className="text-xs text-gray-500">
                        {mediaFile.uploadProgress}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">في الانتظار</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(mediaFile.id)}
                  disabled={uploading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>إرشادات الرفع:</strong>
          <ul className="mt-1 text-sm space-y-1">
            <li>• الحد الأقصى: {maxFiles} ملفات</li>
            <li>• حجم الملف: حتى {maxSizePerFile} ميجابايت</li>
            <li>• الأنواع المدعومة: الصور، الفيديو، الصوت</li>
            <li>• سيتم ربط الملفات بالتغريدة تلقائياً</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}