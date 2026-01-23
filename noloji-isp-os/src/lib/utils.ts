import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const dateUtils = {
  format: (date: Date | string, format: string = 'short'): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid date'

    const options: Intl.DateTimeFormatOptions = format === 'short'
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : format === 'long'
        ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
        : format === 'time'
          ? { hour: '2-digit', minute: '2-digit' }
          : format === 'datetime'
            ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: '2-digit', month: 'short', year: 'numeric' }

    return d.toLocaleDateString('en-KE', options)
  },

  relative: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid date'

    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })
  },

  isExpired: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d < new Date()
  },

  daysUntil: (date: Date | string): number => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // General statuses
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    disconnected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',

    // Online/Offline statuses
    online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',

    // Payment statuses
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

    // Default
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  return statusColors[status.toLowerCase()] || statusColors.default
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
