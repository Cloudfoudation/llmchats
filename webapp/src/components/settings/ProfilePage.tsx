'use client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'

export function ProfilePage() {
  const { user, userAttributes, isLoading } = useAuth()
  const [profile, setProfile] = useState({
    email: '',
    name: '',
    givenName: '',
    familyName: '',
    picture: ''
  })
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (userAttributes) {
      setProfile({
        email: userAttributes.email || '',
        name: userAttributes.name || '',
        givenName: userAttributes.given_name || '',
        familyName: userAttributes.family_name || '',
        picture: userAttributes.picture || ''
      })
      setImageError(false)
    }
  }, [userAttributes])

  const handleImageError = () => {
    setImageError(true)
  }

  const getInitials = () => {
    if (profile.name) {
      return profile.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return profile.email ? profile.email[0].toUpperCase() : '?'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Profile Settings</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Profile Picture */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            {imageError || !profile.picture ? (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600">
                {getInitials()}
              </div>
            ) : (
              <img
                src={profile.picture}
                alt="Profile"
                onError={handleImageError}
                className="rounded-full w-24 h-24 object-cover border-2 border-gray-300 dark:border-gray-600"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={profile.givenName}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profile.familyName}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional User Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Account Status
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Active
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}