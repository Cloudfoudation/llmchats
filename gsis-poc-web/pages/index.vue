<template>
  <div class="flex-1 flex flex-col bg-gray-50">

    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <!-- Welcome Section (shown when no messages) -->
      <div v-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center p-6">
        <div class="max-w-3xl mx-auto text-center">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What can I help you discover?
          </h1>
          <p class="text-lg text-gray-600 mb-12 leading-relaxed max-w-2xl mx-auto">
            Ask me anything about GSIS benefits, policies, legal matters, or upload documents for analysis. I speak English, Tagalog, and other Filipino languages.
          </p>
          
          <!-- Suggested Questions -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 max-w-2xl mx-auto">
            <button 
              @click="setQuickQuery('What are the GSIS retirement benefits and how are they calculated?')"
              class="group p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                </div>
                <div>
                  <div class="font-medium text-gray-900 mb-1">Retirement Benefits</div>
                  <div class="text-sm text-gray-600">Learn about pension calculations and eligibility</div>
                </div>
              </div>
            </button>
            <button 
              @click="setQuickQuery('How do I apply for a GSIS salary loan and what are the requirements?')"
              class="group p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div>
                  <div class="font-medium text-gray-900 mb-1">Loan Application</div>
                  <div class="text-sm text-gray-600">Step-by-step loan application guide</div>
                </div>
              </div>
            </button>
            <button 
              @click="setQuickQuery('Ano ang mga benepisyo ng GSIS para sa mga miyembro?')"
              class="group p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                  <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <div class="font-medium text-gray-900 mb-1">Mga Benepisyo</div>
                  <div class="text-sm text-gray-600">Tanungin sa Tagalog ang tungkol sa GSIS</div>
                </div>
              </div>
            </button>
            <button 
              @click="setQuickQuery('What legal cases are related to GSIS retirement disputes?')"
              class="group p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                  <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
                  </svg>
                </div>
                <div>
                  <div class="font-medium text-gray-900 mb-1">Legal Research</div>
                  <div class="text-sm text-gray-600">Find relevant legal cases and precedents</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Chat Messages -->
      <div v-else class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto px-4 py-6">
          <div class="space-y-8">
            <div 
              v-for="message in messages" 
              :key="message.id"
              class="group"
            >
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 mt-1">
                  <div 
                    v-if="message.role === 'user'"
                    class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm"
                  >
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div 
                    v-else
                    class="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm"
                  >
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div 
                    v-if="message.role === 'user'"
                    class="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 inline-block max-w-2xl"
                  >
                    <p class="text-gray-900 text-sm leading-relaxed">{{ message.content }}</p>
                  </div>
                  <div 
                    v-else
                    class="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                    v-html="formatMessage(message.content)"
                  ></div>
                  <div class="flex items-center space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1 rounded hover:bg-gray-100 transition-colors">
                      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                    <button class="p-1 rounded hover:bg-gray-100 transition-colors">
                      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Loading indicator -->
            <div v-if="isLoading" class="flex items-start space-x-4">
              <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
              </div>
              <div class="flex items-center space-x-2 mt-2">
                <div class="flex space-x-1">
                  <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
                <span class="text-gray-600 text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Input Area -->
    <div class="bg-white border-t border-gray-100 sticky bottom-0">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <!-- Agent Selector -->
        <div v-if="availableAgents.length > 0" class="mb-3">
          <select
            v-model="selectedAgent"
            class="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Default Assistant</option>
            <option
              v-for="agent in availableAgents"
              :key="agent.id"
              :value="agent.id"
            >
              {{ agent.name }}
            </option>
          </select>
        </div>
        <form @submit.prevent="sendMessage" class="relative">
          <div class="relative flex items-center">
            <input
              v-model="currentMessage"
              type="text"
              placeholder="Ask me anything about GSIS..."
              class="w-full pl-4 pr-12 py-4 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              :disabled="isLoading"
            />
            <div class="absolute right-2 flex items-center space-x-1">
              <button
                type="button"
                class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Attach file"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                </svg>
              </button>
              <button
                type="submit"
                :disabled="!currentMessage.trim() || isLoading"
                class="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 disabled:hover:bg-blue-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
          </div>
        </form>
        <div class="flex items-center justify-center mt-3">
          <p class="text-xs text-gray-500">
            GSIS AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
// Add auth middleware
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// SOLID Principles Applied:
// S - Single Responsibility: Each component has one clear purpose
// O - Open/Closed: Extensible through composables and stores
// L - Liskov Substitution: Components can be replaced with compatible ones
// I - Interface Segregation: Clean separation of concerns
// D - Dependency Inversion: Depends on abstractions (composables/stores)

const messages = ref([])
const currentMessage = ref('')
const isLoading = ref(false)
const selectedAgent = ref('')
const availableAgents = ref([])


// Pinia stores
const authStore = useAuthStore()
const rbacStore = useRBACStore()

// Destructure for template use
const { user, isAdmin } = storeToRefs(authStore)
const { canManageRoles, userPermissions, userDashboard, error } = storeToRefs(rbacStore)

// Get logout function from store (not reactive)
const { logout } = authStore

// Debug logs
watchEffect(() => {
  console.log('🔍 Pinia Debug:')
  console.log('- User:', user.value)
  console.log('- Is Admin:', isAdmin.value)
  console.log('- Can manage roles:', canManageRoles.value)
  console.log('- User permissions:', userPermissions.value)
  console.log('- User dashboard:', userDashboard.value)
  console.log('- RBAC error:', error.value)
})

// Composable for chat functionality (following SOLID principles)
const { sendChatMessage } = useChatService()
const { getAvailableAgentsForUser } = useRoleAgents()

// Fetch available agents on mount
onMounted(async () => {
  try {
    availableAgents.value = await getAvailableAgentsForUser()
  } catch (error) {
    console.error('Failed to load available agents:', error)
  }
})

const sendMessage = async () => {
  if (!currentMessage.value.trim() || isLoading.value) return
  
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: currentMessage.value,
    timestamp: new Date()
  }
  
  messages.value.push(userMessage)
  const query = currentMessage.value
  currentMessage.value = ''
  isLoading.value = true
  
  try {
    // Pass conversation history to maintain context
    const conversationHistory = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    
    const response = await sendChatMessage(query, conversationHistory)
    
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: response,
      timestamp: new Date()
    })
  } catch (error) {
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    })
  } finally {
    isLoading.value = false
  }
}

const setQuickQuery = (query) => {
  currentMessage.value = query
}

const formatMessage = (content) => {
  let formatted = content
    // Headers first (before other formatting)
    .replace(/^#### (.*$)/gm, '<h4 class="text-base font-semibold text-gray-900 mt-3 mb-2">$1</h4>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-4 mb-2">$1</h1>')
    // Math expressions (LaTeX style)
    .replace(/\\\[(.*?)\\\]/g, '<div class="bg-blue-50 border border-blue-200 rounded p-2 my-2 text-center font-mono text-sm">$1</div>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Bullet points
    .replace(/^• (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
    // Convert line breaks to proper spacing
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
  
  // Wrap consecutive <li> elements in <ul>
  formatted = formatted.replace(/(<li[^>]*>.*?<\/li>(<br>)*)+/g, (match) => {
    const cleanMatch = match.replace(/<br>/g, '')
    return `<ul class="my-2 space-y-1">${cleanMatch}</ul>`
  })
  
  return formatted
}

// SEO and meta
useHead({
  title: 'GSIS AI Portal - Enterprise AI Assistant',
  meta: [
    { name: 'description', content: 'Intelligent assistant for GSIS inquiries, legal research, and document analysis' }
  ]
})
</script>