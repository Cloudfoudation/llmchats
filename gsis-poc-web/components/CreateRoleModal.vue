<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div 
        class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        @click="$emit('close')"
      ></div>

      <!-- Modal -->
      <div class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">Create New Role</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Role Name -->
          <div class="mb-6">
            <label for="roleName" class="block text-sm font-medium text-gray-700 mb-2">
              Role Name *
            </label>
            <input
              id="roleName"
              v-model="form.roleName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., General Inquiries, COO, HR Manager"
            />
          </div>

          <!-- Description -->
          <div class="mb-6">
            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this role is for..."
            ></textarea>
          </div>

          <!-- Permissions -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-4">
              Permissions *
            </label>
            
            <!-- Permission Categories -->
            <div class="space-y-4">
              <div 
                v-for="(categoryPermissions, categoryName) in permissionsByCategory"
                :key="categoryName"
                class="border border-gray-200 rounded-lg p-4"
              >
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-gray-900">{{ formatCategoryName(categoryName) }}</h4>
                  <button
                    type="button"
                    @click="toggleCategoryPermissions(categoryName, categoryPermissions)"
                    class="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {{ isCategoryFullySelected(categoryPermissions) ? 'Deselect All' : 'Select All' }}
                  </button>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="permission in categoryPermissions"
                    :key="permission"
                    class="flex items-center space-x-2 text-sm"
                  >
                    <input
                      v-model="form.permissions"
                      type="checkbox"
                      :value="permission"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-gray-700">{{ getPermissionDescription(permission) }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Selected Permissions Summary -->
            <div v-if="form.permissions.length > 0" class="mt-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm font-medium text-blue-900 mb-2">
                Selected Permissions ({{ form.permissions.length }})
              </p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="permission in form.permissions"
                  :key="permission"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {{ getPermissionDescription(permission) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading" class="flex items-center">
                <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Creating...
              </span>
              <span v-else>Create Role</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
// SOLID Principles Applied:
// S - Single Responsibility: Only handles role creation
// O - Open/Closed: Extensible through props and events
// L - Liskov Substitution: Can be replaced with compatible modal
// I - Interface Segregation: Clean props and events interface
// D - Dependency Inversion: Depends on RBAC composable abstraction

const emit = defineEmits(['close', 'created'])

const rbacStore = useRBACStore()
const { createRole, getPermissionsByCategory, getPermissionDescription } = rbacStore

// Form state
const form = reactive({
  roleName: '',
  description: '',
  permissions: []
})

const isLoading = ref(false)
const error = ref('')

// Get available permissions by category
const permissionsByCategory = getPermissionsByCategory()

// Computed
const isFormValid = computed(() => {
  return form.roleName.trim() && form.permissions.length > 0
})

// Methods
const formatCategoryName = (categoryName) => {
  return categoryName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

const isCategoryFullySelected = (categoryPermissions) => {
  return categoryPermissions.every(permission => form.permissions.includes(permission))
}

const toggleCategoryPermissions = (categoryName, categoryPermissions) => {
  const isFullySelected = isCategoryFullySelected(categoryPermissions)
  
  if (isFullySelected) {
    // Remove all permissions from this category
    form.permissions = form.permissions.filter(permission => 
      !categoryPermissions.includes(permission)
    )
  } else {
    // Add all permissions from this category
    categoryPermissions.forEach(permission => {
      if (!form.permissions.includes(permission)) {
        form.permissions.push(permission)
      }
    })
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    isLoading.value = true
    error.value = ''

    await createRole({
      roleName: form.roleName.trim(),
      description: form.description.trim(),
      permissions: form.permissions
    })

    emit('created')
  } catch (err) {
    error.value = err.message || 'Failed to create role'
  } finally {
    isLoading.value = false
  }
}

// Reset form when modal opens
const resetForm = () => {
  form.roleName = ''
  form.description = ''
  form.permissions = []
  error.value = ''
}

onMounted(() => {
  resetForm()
})
</script>