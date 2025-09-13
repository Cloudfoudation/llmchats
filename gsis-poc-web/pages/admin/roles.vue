<template>
  <div class="flex-1 bg-gray-50">
    <!-- Page Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Role Management</h1>
          <p class="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <button
          v-if="canManageRoles"
          @click="showCreateModal = true"
          class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 md:px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <span class="md:hidden">+</span>
          <span class="hidden md:inline">+ Create Role</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-6 py-6">

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