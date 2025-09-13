<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Mobile Menu Overlay -->
    <div v-if="showMobileMenu" @click="showMobileMenu = false" class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"></div>
    
    <!-- Sidebar -->
    <aside :class="[
      'w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transition-transform duration-300 z-50',
      'lg:translate-x-0 lg:relative lg:block',
      showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      'fixed inset-y-0 left-0 lg:static'
    ]">
      <!-- Logo/Brand -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h1 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">GSIS</h1>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-2">
        <NuxtLink 
          to="/" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
          :class="{ 'bg-blue-50 text-blue-600': $route.path === '/' }"
          @click="showMobileMenu = false"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <span class="font-medium">Chat</span>
        </NuxtLink>

        <NuxtLink 
          to="/image-search" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-green-50 hover:text-green-600 transition-all duration-200 group"
          :class="{ 'bg-green-50 text-green-600': $route.path === '/image-search' }"
          @click="showMobileMenu = false"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="font-medium">Image Search</span>
        </NuxtLink>

        <!-- Admin Section -->
        <div v-if="authStore.isAdmin" class="pt-4">
          <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>
          
          <NuxtLink 
            to="/admin/agents" 
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-all duration-200 group"
            :class="{ 'bg-purple-50 text-purple-600': $route.path === '/admin/agents' }"
            @click="showMobileMenu = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span class="font-medium">Agents</span>
          </NuxtLink>

          <NuxtLink 
            to="/admin/users" 
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
            :class="{ 'bg-blue-50 text-blue-600': $route.path === '/admin/users' }"
            @click="showMobileMenu = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
            </svg>
            <span class="font-medium">Users</span>
          </NuxtLink>

          <NuxtLink 
            to="/admin/roles" 
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 group"
            :class="{ 'bg-orange-50 text-orange-600': $route.path === '/admin/roles' }"
            @click="showMobileMenu = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span class="font-medium">Roles</span>
          </NuxtLink>

          <NuxtLink 
            to="/admin/knowledge-bases" 
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group"
            :class="{ 'bg-indigo-50 text-indigo-600': $route.path === '/admin/knowledge-bases' }"
            @click="showMobileMenu = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"></path>
            </svg>
            <span class="font-medium">Knowledge Bases</span>
          </NuxtLink>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-50">
          <div class="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-medium">{{ userInitials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.email }}</p>
            <p class="text-xs text-gray-500">{{ authStore.user?.groups?.[0] || 'user' }}</p>
          </div>
          <button @click="authStore.logout" class="text-gray-400 hover:text-red-500 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 lg:ml-0">
      <!-- Mobile Header -->
      <div class="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button @click="showMobileMenu = true" class="p-2 text-gray-600 hover:text-gray-900">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h1 class="text-lg font-semibold text-gray-900">GSIS</h1>
        <div class="w-10"></div>
      </div>
      
      <!-- Page Content with Transition -->
      <div class="flex-1 relative">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
const showMobileMenu = ref(false)

const userInitials = computed(() => {
  if (!authStore.user?.email) return 'U'
  return authStore.user.email.charAt(0).toUpperCase()
})

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  showMobileMenu.value = false
})
</script>