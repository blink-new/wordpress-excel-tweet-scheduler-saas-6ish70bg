import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Calendar, Clock, Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { safeParseDate, formatForDateTimeInput, formatDateSafely, formatTimeSafely, isDateInFuture } from '@/utils/dateUtils'

interface DateTimeEditorProps {
  currentDateTime: string
  onSave: (newDateTime: string) => void
  disabled?: boolean
}

export default function DateTimeEditor({ currentDateTime, onSave, disabled = false }: DateTimeEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const handleOpen = () => {
    try {
      const dateObj = safeParseDate(currentDateTime)
      if (!dateObj) {
        console.warn('Invalid date provided to DateTimeEditor:', currentDateTime)
        // Use current date + 1 hour as fallback
        const fallback = new Date()
        fallback.setHours(fallback.getHours() + 1)
        fallback.setMinutes(0)
        fallback.setSeconds(0)
        setDate(fallback.toISOString().split('T')[0])
        setTime(fallback.toTimeString().slice(0, 5))
      } else {
        const dateStr = dateObj.toISOString().split('T')[0]
        const timeStr = dateObj.toTimeString().slice(0, 5)
        setDate(dateStr)
        setTime(timeStr)
      }
    } catch (error) {
      console.error('Error in DateTimeEditor handleOpen:', error)
      // Fallback to current date + 1 hour
      const fallback = new Date()
      fallback.setHours(fallback.getHours() + 1)
      fallback.setMinutes(0)
      fallback.setSeconds(0)
      setDate(fallback.toISOString().split('T')[0])
      setTime(fallback.toTimeString().slice(0, 5))
    }
    setIsOpen(true)
  }

  const handleSave = () => {
    if (!date || !time) return

    try {
      // إنشاء التاريخ والوقت الجديد
      const dateTimeString = `${date}T${time}:00`
      const newDateTime = new Date(dateTimeString)
      
      if (isNaN(newDateTime.getTime())) {
        alert('التاريخ والوقت غير صحيح')
        return
      }
      
      // التحقق من أن التاريخ في المستقبل
      const now = new Date()
      if (newDateTime <= now) {
        alert('يجب أن يكون التاريخ والوقت في المستقبل')
        return
      }

      onSave(newDateTime.toISOString())
      setIsOpen(false)
    } catch (error) {
      console.error('Error saving date:', error)
      alert('حدث خطأ في حفظ التاريخ')
    }
  }

  const formatDateTime = (dateTimeStr: string) => {
    return {
      date: formatDateSafely(dateTimeStr, 'ar-SA'),
      time: formatTimeSafely(dateTimeStr, 'ar-SA', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatted = formatDateTime(currentDateTime)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          disabled={disabled}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="تعديل التاريخ والوقت"
        >
          <Calendar className="h-3 w-3" />
          <Clock className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            تعديل موعد النشر
          </DialogTitle>
          <DialogDescription>
            اختر التاريخ والوقت الجديد لنشر التغريدة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">الوقت</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-right"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">الموعد الحالي:</div>
            <div className="text-sm font-medium">
              {formatted.date} في {formatted.time}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4 ml-1" />
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={!date || !time}>
            <Save className="h-4 w-4 ml-1" />
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}