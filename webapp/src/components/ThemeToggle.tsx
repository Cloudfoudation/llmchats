'use client'

import * as React from 'react'
import { useTheme } from '@/providers/ThemeProvider'
import { useTranslations } from 'next-intl'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings')

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 rotate-0 scale-100"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )
      case 'dark':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 rotate-0 scale-100"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )
      default: // system
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return t('lightMode')
      case 'dark':
        return t('darkMode')
      default:
        return t('systemMode')
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 h-9 px-3"
      title={t('switchTheme')}
      aria-label={`${t('currentTheme')}: ${getThemeLabel()}. ${t('clickToSwitch')}`}
    >
      {getThemeIcon()}
      <span className="sr-only sm:not-sr-only transition-opacity duration-200">
        {getThemeLabel()}
      </span>
    </button>
  )
}