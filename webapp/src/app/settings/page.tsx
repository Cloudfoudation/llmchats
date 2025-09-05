'use client'
import { useTheme } from 'next-themes'
import { SettingsLayout } from '@/components/settings/SettingsLayout'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${theme === 'dark'
        ? 'bg-gray-900 text-white'
        : 'bg-white text-gray-900'
      }`}>
      <SettingsLayout />
    </div>
  )
}