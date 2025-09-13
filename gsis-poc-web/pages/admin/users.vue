<template>
  <div class="flex-1 bg-gray-50">
    <!-- Page Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-1">Manage system users and their permissions</p>
        </div>
        <button
          v-if="canManageUsers"
          @click="showCreateModal = true"
          class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 md:px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <span class="md:hidden">+</span>
          <span class="hidden md:inline">+ Add User</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-6 py-6">
      <!-- Search Bar -->
      <div class="mb-6 flex gap-4">
        <div class="flex-1 relative">
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search users by email or username..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <button
          @click="handleSearch"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        <button
          @click="refreshUsers"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="ml-3">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-lg shadow border border-gray-200">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="isLoading">
                <td colspan="5" class="px-6 py-4 text-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p class="mt-2 text-gray-600">Loading users...</p>
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                  <p class="text-lg font-medium">No users found</p>
                  <p class="text-sm">{{ searchQuery ? 'Try a different search term' : 'No users available' }}</p>
                </td>
              </tr>
              <tr v-else v-for="user in users" :key="user.username" class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-2">
                    <span :class="getStatusClass(user.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                      {{ user.status }}
                    </span>
                    <span v-if="user.enabled" class="text-green-500" title="Enabled">✓</span>
                    <span v-else class="text-red-500" title="Disabled">✗</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="group in user.groups"
                      :key="group"
                      :class="getGroupClass(group)"
                      class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full"
                    >
                      {{ group }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <div class="flex space-x-2">
                    <button
                      @click="editUser(user)"
                      class="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit User"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button
                      @click="deleteUser(user)"
                      class="text-red-600 hover:text-red-900 transition-colors"
                      title="Delete User"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="users.length > 0" class="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-700">
            Showing {{ users.length }} results
            <span v-if="currentPage > 0">(Page {{ currentPage + 1 }})</span>
          </div>
          <div class="flex space-x-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 0"
              class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="!paginationToken"
              class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin']
})

const config = useRuntimeConfig()
const authStore = useAuthStore()
const rbacStore = useRBACStore()

// State
const users = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const showCreateModal = ref(false)
const paginationToken = ref(null)
const currentPage = ref(0)
const pageTokens = ref([null])

// Computed
const canManageUsers = computed(() => rbacStore.canManageUsers)

// Methods
const fetchUsers = async (token = null, filter = null, pageIndex = 0) => {
  isLoading.value = true
  error.value = null
  
  try {
    const params = new URLSearchParams({
      limit: '10'
    })
    
    if (token) params.append('paginationToken', token)
    if (filter) params.append('filter', filter)
    
    const response = await $fetch(`${config.public.userManagementApiUrl}users?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.success && response.data) {
      users.value = response.data.users
      paginationToken.value = response.data.paginationToken || null
      
      // Update page tokens
      if (response.data.paginationToken && pageIndex !== undefined) {
        const newPageTokens = [...pageTokens.value]
        while (newPageTokens.length <= pageIndex + 1) {
          newPageTokens.push(null)
        }
        newPageTokens[pageIndex + 1] = response.data.paginationToken
        pageTokens.value = newPageTokens
      }
    } else {
      error.value = response.error?.message || 'Failed to fetch users'
      users.value = []
    }
  } catch (err) {
    error.value = err.message || 'Failed to fetch users'
    users.value = []
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 0
  pageTokens.value = [null]
  const filter = searchQuery.value ? `email ^= "${searchQuery.value}" or username ^= "${searchQuery.value}"` : null
  fetchUsers(null, filter, 0)
}

const refreshUsers = () => {
  const currentToken = pageTokens.value[currentPage.value]
  fetchUsers(currentToken, null, currentPage.value)
}

const nextPage = () => {
  if (paginationToken.value) {
    const nextPageIndex = currentPage.value + 1
    currentPage.value = nextPageIndex
    fetchUsers(paginationToken.value, null, nextPageIndex)
  }
}

const previousPage = () => {
  if (currentPage.value > 0) {
    const prevPageIndex = currentPage.value - 1
    currentPage.value = prevPageIndex
    const prevToken = pageTokens.value[prevPageIndex]
    fetchUsers(prevToken, null, prevPageIndex)
  }
}

const editUser = (user) => {
  // TODO: Implement edit user modal
  console.log('Edit user:', user)
}

const deleteUser = async (user) => {
  if (!confirm(`Are you sure you want to delete user ${user.username}?`)) {
    return
  }
  
  try {
    const response = await $fetch(`${config.public.userManagementApiUrl}users/${encodeURIComponent(user.username)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.success) {
      refreshUsers()
    } else {
      error.value = response.error?.message || 'Failed to delete user'
    }
  } catch (err) {
    error.value = err.message || 'Failed to delete user'
  }
}

// Utility functions
const getStatusClass = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800'
    case 'UNCONFIRMED':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-red-100 text-red-800'
  }
}

const getGroupClass = (group) => {
  switch (group) {
    case 'gsis-admin':
      return 'bg-purple-100 text-purple-800'
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'government-admin':
      return 'bg-blue-100 text-blue-800'
    case 'department-head':
      return 'bg-indigo-100 text-indigo-800'
    case 'analyst':
      return 'bg-green-100 text-green-800'
    case 'viewer':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Initialize
onMounted(() => {
  fetchUsers()
})

useHead({
  title: 'User Management - GSIS AI Portal'
})
</script>