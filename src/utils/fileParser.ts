import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { safeParseDate, safeDateToISOString, addHours } from './dateUtils'

export interface ParsedTweet {
  content: string
  scheduledAt: string
  hashtags?: string[]
  mediaUrls?: string[]
  row: number
  status: 'pending' | 'scheduled' | 'error'
  error?: string
}

export interface FileParseResult {
  tweets: ParsedTweet[]
  errors: string[]
  totalRows: number
}

// Expected column names (case insensitive)
const CONTENT_COLUMNS = ['content', 'tweet', 'text', 'message', 'محتوى', 'تغريدة', 'نص']
const DATE_COLUMNS = ['date', 'scheduled_at', 'schedule_date', 'time', 'datetime', 'تاريخ', 'وقت', 'موعد']
const HASHTAG_COLUMNS = ['hashtags', 'tags', 'هاشتاج', 'علامات']
const MEDIA_COLUMNS = ['media', 'images', 'videos', 'files', 'وسائط', 'صور', 'فيديوهات']

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
  
  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => 
      h.includes(name.toLowerCase()) || name.toLowerCase().includes(h)
    )
    if (index !== -1) return index
  }
  
  return -1
}

function parseDate(dateValue: any, tweetIndex: number = 0): string | null {
  if (!dateValue) return null
  
  try {
    // Handle common date formats from Excel/CSV
    let normalizedValue = dateValue
    
    // If it's a string, try to normalize it
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim()
      if (!trimmed) return null
      
      // Handle formats like "2024-01-25 10:00:00" (missing timezone)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed + '.000Z'
      }
      // Handle formats like "2024-01-25T10:00:00" (missing timezone)
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed + '.000Z'
      }
      // Handle formats like "2024-01-25" (date only)
      else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed + 'T12:00:00.000Z'
      }
    }
    
    const parsed = safeParseDate(normalizedValue)
    if (!parsed) {
      console.warn('Failed to parse date value:', dateValue, 'normalized to:', normalizedValue)
      return null
    }
    
    // Ensure the date is in the future (at least 1 minute from now)
    const now = new Date()
    const oneMinuteFromNow = new Date(now.getTime() + 60000)
    
    if (parsed < oneMinuteFromNow) {
      console.warn('Date is in the past, adjusting to future:', parsed)
      // If date is in the past, schedule it for next hour with incremental spacing
      const nextHour = new Date()
      nextHour.setHours(nextHour.getHours() + 1)
      nextHour.setMinutes(tweetIndex * 15) // 15 minutes apart for each tweet
      nextHour.setSeconds(0)
      nextHour.setMilliseconds(0)
      return nextHour.toISOString()
    }
    
    return parsed.toISOString()
  } catch (error) {
    console.warn('Failed to parse date in parseDate function:', dateValue, error)
    return null
  }
}

function validateTweetContent(content: string): { isValid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'محتوى التغريدة مطلوب' }
  }
  
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return { isValid: false, error: 'محتوى التغريدة لا يمكن أن يكون فارغاً' }
  }
  
  if (trimmed.length > 280) {
    return { isValid: false, error: `محتوى التغريدة طويل جداً (${trimmed.length}/280 حرف)` }
  }
  
  return { isValid: true }
}

export async function parseExcelFile(file: File): Promise<FileParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length === 0) {
          resolve({
            tweets: [],
            errors: ['الملف فارغ أو لا يحتوي على بيانات'],
            totalRows: 0
          })
          return
        }
        
        // Get headers from first row
        const headers = jsonData[0].map(h => String(h || '').trim())
        const dataRows = jsonData.slice(1)
        
        // Find column indices
        const contentIndex = findColumnIndex(headers, CONTENT_COLUMNS)
        const dateIndex = findColumnIndex(headers, DATE_COLUMNS)
        const hashtagIndex = findColumnIndex(headers, HASHTAG_COLUMNS)
        const mediaIndex = findColumnIndex(headers, MEDIA_COLUMNS)
        
        if (contentIndex === -1) {
          resolve({
            tweets: [],
            errors: [`لم يتم العثور على عمود المحتوى. الأعمدة المتوقعة: ${CONTENT_COLUMNS.join(', ')}`],
            totalRows: dataRows.length
          })
          return
        }
        
        const tweets: ParsedTweet[] = []
        const errors: string[] = []
        
        dataRows.forEach((row, index) => {
          const rowNumber = index + 2 // +2 because we start from row 2 (after header)
          
          // Skip empty rows
          if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
            return
          }
          
          const content = String(row[contentIndex] || '').trim()
          const dateValue = row[dateIndex]
          const hashtagValue = hashtagIndex !== -1 ? String(row[hashtagIndex] || '').trim() : ''
          const mediaValue = mediaIndex !== -1 ? String(row[mediaIndex] || '').trim() : ''
          
          // Validate content
          const contentValidation = validateTweetContent(content)
          if (!contentValidation.isValid) {
            errors.push(`الصف ${rowNumber}: ${contentValidation.error}`)
            return
          }
          
          // Parse date
          let scheduledAt: string
          if (dateIndex === -1 || !dateValue) {
            // If no date column or empty date, schedule for next hour with incremental spacing
            const nextHour = addHours(new Date(), tweets.length + 1)
            if (!nextHour) {
              errors.push(`الصف ${rowNumber}: فشل في إنشاء تاريخ افتراضي`)
              return
            }
            // Add incremental minutes to avoid same time for all tweets
            nextHour.setMinutes(tweets.length * 15) // 15 minutes apart
            nextHour.setSeconds(0)
            scheduledAt = nextHour.toISOString()
          } else {
            const parsedDate = parseDate(dateValue, tweets.length)
            if (!parsedDate) {
              errors.push(`الصف ${rowNumber}: تاريخ غير صحيح - ${dateValue}`)
              return
            }
            scheduledAt = parsedDate
          }
          
          // Parse hashtags
          const hashtags = hashtagValue 
            ? hashtagValue.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean)
            : undefined
          
          // Parse media URLs
          const mediaUrls = mediaValue 
            ? mediaValue.split(',').map(url => url.trim()).filter(Boolean)
            : undefined
          
          tweets.push({
            content,
            scheduledAt,
            hashtags,
            mediaUrls,
            row: rowNumber,
            status: 'pending'
          })
        })
        
        resolve({
          tweets,
          errors,
          totalRows: dataRows.length
        })
        
      } catch (error) {
        resolve({
          tweets: [],
          errors: [`خطأ في قراءة ملف Excel: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
          totalRows: 0
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        tweets: [],
        errors: ['فشل في قراءة الملف'],
        totalRows: 0
      })
    }
    
    reader.readAsArrayBuffer(file)
  })
}

export async function parseCSVFile(file: File): Promise<FileParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[]
          
          if (data.length === 0) {
            resolve({
              tweets: [],
              errors: ['الملف فارغ أو لا يحتوي على بيانات'],
              totalRows: 0
            })
            return
          }
          
          // Get headers
          const headers = Object.keys(data[0] || {})
          
          // Find column names
          const contentColumn = headers.find(h => 
            CONTENT_COLUMNS.some(col => 
              h.toLowerCase().includes(col.toLowerCase()) || 
              col.toLowerCase().includes(h.toLowerCase())
            )
          )
          
          const dateColumn = headers.find(h => 
            DATE_COLUMNS.some(col => 
              h.toLowerCase().includes(col.toLowerCase()) || 
              col.toLowerCase().includes(h.toLowerCase())
            )
          )
          
          const hashtagColumn = headers.find(h => 
            HASHTAG_COLUMNS.some(col => 
              h.toLowerCase().includes(col.toLowerCase()) || 
              col.toLowerCase().includes(h.toLowerCase())
            )
          )
          
          const mediaColumn = headers.find(h => 
            MEDIA_COLUMNS.some(col => 
              h.toLowerCase().includes(col.toLowerCase()) || 
              col.toLowerCase().includes(h.toLowerCase())
            )
          )
          
          if (!contentColumn) {
            resolve({
              tweets: [],
              errors: [`لم يتم العثور على عمود المحتوى. الأعمدة المتوقعة: ${CONTENT_COLUMNS.join(', ')}`],
              totalRows: data.length
            })
            return
          }
          
          const tweets: ParsedTweet[] = []
          const errors: string[] = []
          
          data.forEach((row, index) => {
            const rowNumber = index + 2 // +2 because CSV header is row 1
            
            const content = String(row[contentColumn] || '').trim()
            const dateValue = dateColumn ? row[dateColumn] : null
            const hashtagValue = hashtagColumn ? String(row[hashtagColumn] || '').trim() : ''
            const mediaValue = mediaColumn ? String(row[mediaColumn] || '').trim() : ''
            
            // Validate content
            const contentValidation = validateTweetContent(content)
            if (!contentValidation.isValid) {
              errors.push(`الصف ${rowNumber}: ${contentValidation.error}`)
              return
            }
            
            // Parse date
            let scheduledAt: string
            if (!dateColumn || !dateValue) {
              // If no date column or empty date, schedule for next hour with incremental spacing
              const nextHour = addHours(new Date(), tweets.length + 1)
              if (!nextHour) {
                errors.push(`الصف ${rowNumber}: فشل في إنشاء تاريخ افتراضي`)
                return
              }
              // Add incremental minutes to avoid same time for all tweets
              nextHour.setMinutes(tweets.length * 15) // 15 minutes apart
              nextHour.setSeconds(0)
              scheduledAt = nextHour.toISOString()
            } else {
              const parsedDate = parseDate(dateValue, tweets.length)
              if (!parsedDate) {
                errors.push(`الصف ${rowNumber}: تاريخ غير صحيح - ${dateValue}`)
                return
              }
              scheduledAt = parsedDate
            }
            
            // Parse hashtags
            const hashtags = hashtagValue 
              ? hashtagValue.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean)
              : undefined
            
            // Parse media URLs
            const mediaUrls = mediaValue 
              ? mediaValue.split(',').map(url => url.trim()).filter(Boolean)
              : undefined
            
            tweets.push({
              content,
              scheduledAt,
              hashtags,
              mediaUrls,
              row: rowNumber,
              status: 'pending'
            })
          })
          
          // Add parsing errors from Papa Parse
          if (results.errors && results.errors.length > 0) {
            results.errors.forEach(error => {
              errors.push(`خطأ في الصف ${error.row + 1}: ${error.message}`)
            })
          }
          
          resolve({
            tweets,
            errors,
            totalRows: data.length
          })
          
        } catch (error) {
          resolve({
            tweets: [],
            errors: [`خطأ في قراءة ملف CSV: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
            totalRows: 0
          })
        }
      },
      error: (error) => {
        resolve({
          tweets: [],
          errors: [`فشل في قراءة ملف CSV: ${error.message}`],
          totalRows: 0
        })
      }
    })
  })
}

export async function parseFile(file: File): Promise<FileParseResult> {
  const fileExtension = file.name.toLowerCase().split('.').pop()
  
  switch (fileExtension) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file)
    case 'csv':
      return parseCSVFile(file)
    default:
      return {
        tweets: [],
        errors: [`نوع الملف غير مدعوم: ${fileExtension}. الأنواع المدعومة: .xlsx, .xls, .csv`],
        totalRows: 0
      }
  }
}