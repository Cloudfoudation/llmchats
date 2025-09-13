<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/" class="text-gray-600 hover:text-gray-900">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Role Management</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">{{ user?.email }}</span>
            <button @click="logout" class="text-gray-600 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Actions Bar -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-medium text-gray-900">Roles</h2>
          <p class="text-sm text-gray-600">Manage user roles and permissions</p>
        </div>
        <button
          v-if="canManageRoles"
          @click="showCreateModal = true"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Create Role
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

      <!-- Loading State -->
      <div v-if="isLoading && roles.length === 0" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading roles...</p>
      </div>

      <!-- Roles Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="role in roles"
          :key="role.roleId"
          class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">{{ role.roleName }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ role.description }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="assignAgent(role)"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                title="Assign agent"
              >
                + Assign Agent
              </button>
            </div>
          </div>

          <!-- Permissions -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Permissions</h4>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="permission in role.permissions.slice(0, 3)"
                :key="permission"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {{ getPermissionDescription(permission) }}
              </span>
              <span
                v-if="role.permissions.length > 3"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                +{{ role.permissions.length - 3 }} more
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center justify-between text-sm text-gray-600">
            <span>{{ role.assignedAgentCount || 0 }} agents assigned</span>
            <span>Created {{ formatDate(role.createdAt) }}</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="roles.length === 0 && !isLoading" class="col-span-full text-center py-12">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
          <p class="text-gray-600 mb-4">Get started by creating your first role.</p>
          <button
            v-if="canManageRoles"
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Role
          </button>
        </div>
      </div>
    </main>

    <!-- Create Role Modal -->
    <CreateRoleModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleRoleCreated"
    />

    <!-- Assign Agent Modal -->
    <AssignAgentModal
      v-if="showAssignModal && selectedRole"
      :role="selectedRole"
      @close="showAssignModal = false"
      @assigned="handleAgentAssigned"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const rbacStore = useRBACStore()

const { user } = storeToRefs(authStore)
const { logout } = authStore
const { 
  roles, 
  isLoading, 
  error, 
  canManageRoles
} = storeToRefs(rbacStore)

const { fetchRoles, getPermissionDescription } = rbacStore

const showCreateModal = ref(false)
const showAssignModal = ref(false)
const selectedRole = ref(null)

const handleRoleCreated = () => {
  showCreateModal.value = false
  fetchRoles()
}

const assignAgent = (role) => {
  selectedRole.value = role
  showAssignModal.value = true
}

const handleAgentAssigned = () => {
  showAssignModal.value = false
  selectedRole.value = null
  rbacStore.fetchRoles() // Refresh to update agent counts
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  rbacStore.fetchRoles()
})

useHead({
  title: 'Role Management - GSIS AI Portal'
})
</script>