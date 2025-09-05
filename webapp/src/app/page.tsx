'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import ChatLayout from '@/components/chat/ChatLayout';

export default function Page() {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <div className={`min-h-screen transition-colors duration-200 ${
            theme === 'dark' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-900'
        }`}>
            <ChatLayout />
        </div>
    )
}