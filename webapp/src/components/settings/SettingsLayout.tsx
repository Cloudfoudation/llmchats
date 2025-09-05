'use client'
import { withAuth } from '@/hocs/withAuth'
import { ProfilePage } from '@/components/settings/ProfilePage'
import { ApiKeysPage } from './ApiKeysPage'
import { ExternalApiKeysPage } from './ExternalApiKeysPage'
import { UserManagementPage } from '../users/UserManagementPage'
import { GroupManagementPage } from '../groups/GroupManagementPage'
import { useState } from 'react'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { useAuthContext } from '@/providers/AuthProvider'
import { useTranslations } from 'next-intl'

export default withAuth(SettingsLayout)

export function SettingsLayout() {
  const t = useTranslations('settings')
  const tNav = useTranslations('navigation')
  const [activeTab, setActiveTab] = useState('profile')
  const { userAttributes } = useAuthContext()

  // Check if user is in paid or admin group
  const hasPremiumAccess = userAttributes?.['cognito:groups']?.some(
    group => group === 'paid' || group === 'admin'
  ) || false

  // Check if user is admin
  const isAdmin = userAttributes?.['cognito:groups']?.some(
    group => group === 'admin'
  ) || false

  // If the user doesn't have premium access but had selected a premium tab,
  // reset to profile tab
  if (!hasPremiumAccess && (activeTab === 'api-keys')) {
    setActiveTab('profile')
  }

  // If the user is not an admin but had selected the admin tabs,
  // reset to profile tab
  if (!isAdmin && (activeTab === 'user-management')) {
    setActiveTab('profile')
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'profile':
        return t('profile')
      case 'api-keys':
        return t('apiKeys')
      case 'external-api-keys':
        return t('externalApiKeys')
      case 'user-management':
        return t('userManagement')
      case 'group-management':
        return t('groupManagement')
      default:
        return t('profile')
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link
                href="/"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <Home className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="sr-only">{tNav('home')}</span>
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight
                  className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
                <span
                  className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400"
                  aria-current="page"
                >
                  {t('title')}
                </span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight
                  className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
                <span
                  className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400"
                  aria-current="page"
                >
                  {getTabTitle()}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                    } whitespace-nowrap pb-4 pt-6 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  {t('profile')}
                </button>

                {/* Only show API Keys tabs for premium users */}
                {/* {hasPremiumAccess && (
              <>
                <button
                  onClick={() => setActiveTab('api-keys')}
                  className={`${activeTab === 'api-keys'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                >
                  API Keys
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('external-api-keys')}
              className={`${activeTab === 'external-api-keys'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              External API Keys
            </button> */}

                {/* Group Management tab for all authenticated users */}
                <button
                  onClick={() => setActiveTab('group-management')}
                  className={`${activeTab === 'group-management'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                    } whitespace-nowrap pb-4 pt-6 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Groups
                </button>

                {/* Only show User Management tab for admin users */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('user-management')}
                    className={`${activeTab === 'user-management'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                      } whitespace-nowrap pb-4 pt-6 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    User Management
                  </button>
                )}
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 bg-white dark:bg-gray-800 transition-colors duration-200">
              {activeTab === 'profile' && <ProfilePage />}
              {activeTab === 'api-keys' && hasPremiumAccess && <ApiKeysPage />}
              {activeTab === 'external-api-keys' && <ExternalApiKeysPage />}
              {activeTab === 'group-management' && <GroupManagementPage />}
              {activeTab === 'user-management' && isAdmin && <UserManagementPage />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}