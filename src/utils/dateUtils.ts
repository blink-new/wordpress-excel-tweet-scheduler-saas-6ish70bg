/**
 * Safe date utilities to prevent "RangeError: invalid date" errors
 */

export function isValidDate(date: any): boolean {
  if (!date) return false
  if (date instanceof Date) {
    return !isNaN(date.getTime())
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }
  return false
}

export function safeParseDate(dateValue: any): Date | null {
  if (!dateValue) return null
  
  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isValidDate(dateValue) ? dateValue : null
    }
    
    // If it's a string
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim()
      if (!trimmed) return null
      
      // Handle common problematic formats
      let normalizedValue = trimmed
      
      // Handle formats like "2024-01-25 10:00:00" (missing timezone)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed.replace(' ', 'T') + '.000Z'
      }
      // Handle formats like "2024-01-25T10:00:00" (missing timezone)
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed + '.000Z'
      }
      // Handle formats like "2024-01-25" (date only)
      else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        normalizedValue = trimmed + 'T12:00:00.000Z'
      }
      
      const parsed = new Date(normalizedValue)
      return isValidDate(parsed) ? parsed : null
    }
    
    // If it's a number (Excel serial date or timestamp)
    if (typeof dateValue === 'number') {
      // Check if it's an Excel serial date (between 1 and 2958465 - reasonable range)
      if (dateValue > 1 && dateValue < 2958465) {
        // Excel date serial number to JavaScript Date
        const excelDate = new Date((dateValue - 25569) * 86400 * 1000)
        return isValidDate(excelDate) ? excelDate : null
      }
      
      // Otherwise treat as timestamp
      const timestampDate = new Date(dateValue)
      return isValidDate(timestampDate) ? timestampDate : null
    }
    
    return null
  } catch (error) {
    console.warn('Failed to parse date:', dateValue, error)
    return null
  }
}

export function safeDateToISOString(dateValue: any): string | null {
  const parsed = safeParseDate(dateValue)
  return parsed ? parsed.toISOString() : null
}

export function formatDateSafely(dateValue: any, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return 'Invalid Date'
  
  try {
    return parsed.toLocaleDateString(locale, options)
  } catch (error) {
    console.warn('Failed to format date:', dateValue, error)
    return 'Invalid Date'
  }
}

export function formatTimeSafely(dateValue: any, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return 'Invalid Time'
  
  try {
    return parsed.toLocaleTimeString(locale, options)
  } catch (error) {
    console.warn('Failed to format time:', dateValue, error)
    return 'Invalid Time'
  }
}

export function formatDateTimeSafely(dateValue: any, locale: string = 'en-US'): string {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return 'Invalid DateTime'
  
  try {
    return parsed.toLocaleString(locale)
  } catch (error) {
    console.warn('Failed to format datetime:', dateValue, error)
    return 'Invalid DateTime'
  }
}

export function formatForDateTimeInput(dateValue: any): string {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return ''
  
  try {
    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    return parsed.toISOString().slice(0, 16)
  } catch (error) {
    console.warn('Failed to format for datetime input:', dateValue, error)
    return ''
  }
}

export function createSafeDate(year?: number, month?: number, day?: number, hour?: number, minute?: number): Date | null {
  try {
    const date = new Date(
      year || new Date().getFullYear(),
      month !== undefined ? month : new Date().getMonth(),
      day || new Date().getDate(),
      hour || 0,
      minute || 0,
      0,
      0
    )
    return isValidDate(date) ? date : null
  } catch (error) {
    console.warn('Failed to create safe date:', { year, month, day, hour, minute }, error)
    return null
  }
}

export function addHours(dateValue: any, hours: number): Date | null {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return null
  
  try {
    const newDate = new Date(parsed)
    newDate.setHours(newDate.getHours() + hours)
    return isValidDate(newDate) ? newDate : null
  } catch (error) {
    console.warn('Failed to add hours to date:', dateValue, hours, error)
    return null
  }
}

export function addDays(dateValue: any, days: number): Date | null {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return null
  
  try {
    const newDate = new Date(parsed)
    newDate.setDate(newDate.getDate() + days)
    return isValidDate(newDate) ? newDate : null
  } catch (error) {
    console.warn('Failed to add days to date:', dateValue, days, error)
    return null
  }
}

export function isDateInFuture(dateValue: any): boolean {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return false
  
  try {
    return parsed.getTime() > Date.now()
  } catch (error) {
    console.warn('Failed to check if date is in future:', dateValue, error)
    return false
  }
}

export function isDateInPast(dateValue: any): boolean {
  const parsed = safeParseDate(dateValue)
  if (!parsed) return false
  
  try {
    return parsed.getTime() < Date.now()
  } catch (error) {
    console.warn('Failed to check if date is in past:', dateValue, error)
    return false
  }
}