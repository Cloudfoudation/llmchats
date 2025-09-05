"use client"
// src/app/auth/logout/page.tsx
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/providers/AuthProvider'
import { useEffect } from 'react'

export default function LogoutPage() {
  const { logout } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    logout()
  }, [logout, router])

  return null
}