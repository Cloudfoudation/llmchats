<template>
  <div class="chat-message" :class="messageClass">
    <div class="message-avatar">
      <div v-if="message.role === 'user'" class="user-avatar">
        {{ user?.email?.charAt(0).toUpperCase() || 'U' }}
      </div>
      <div v-else class="ai-avatar">
        🤖
      </div>
    </div>
    
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">
          {{ message.role === 'user' ? (user?.email || 'You') : 'GSIS AI Assistant' }}
        </span>
        <span class="message-time">
          {{ formatTime(message.timestamp) }}
        </span>
      </div>
      
      <div class="message-text" v-html="formattedContent"></div>
      
      <div v-if="message.role === 'assistant'" class="message-actions">
        <button @click="copyMessage" class="action-btn" title="Copy message">
          📋
        </button>
        <button @click="regenerateMessage" class="action-btn" title="Regenerate">
          🔄
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

interface Props {
  message: Message
}

const props = defineProps<Props>()
const { user } = useAuth()

const messageClass = computed(() => ({
  'user-message': props.message.role === 'user',
  'ai-message': props.message.role === 'assistant'
}))

const formattedContent = computed(() => {
  let content = props.message.content
  
  // Convert markdown-style formatting to HTML
  content = content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
    // Lists
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n/g, '<br>')
  
  return content
})

const formatTime = (timestamp?: Date) => {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

const copyMessage = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    // Could add a toast notification here
  } catch (err) {
    console.error('Failed to copy message:', err)
  }
}

const regenerateMessage = () => {
  // Emit event to parent to regenerate
  // This would trigger a new API call
}
</script>

<style scoped>
.chat-message {
  @apply flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors;
}

.user-message {
  @apply bg-blue-50 dark:bg-blue-900/20;
}

.ai-message {
  @apply bg-white dark:bg-gray-900;
}

.message-avatar {
  @apply flex-shrink-0;
}

.user-avatar {
  @apply w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium;
}

.ai-avatar {
  @apply w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-lg;
}

.message-content {
  @apply flex-1 min-w-0;
}

.message-header {
  @apply flex items-center justify-between mb-2;
}

.message-sender {
  @apply font-medium text-gray-900 dark:text-gray-100 text-sm;
}

.message-time {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.message-text {
  @apply text-gray-800 dark:text-gray-200 leading-relaxed;
}

.message-text :deep(strong) {
  @apply font-semibold text-gray-900 dark:text-gray-100;
}

.message-text :deep(em) {
  @apply italic;
}

.message-text :deep(.code-block) {
  @apply bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto;
}

.message-text :deep(.code-block code) {
  @apply text-sm font-mono text-gray-800 dark:text-gray-200;
}

.message-text :deep(.inline-code) {
  @apply bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono;
}

.message-text :deep(ul) {
  @apply list-disc list-inside my-2 space-y-1;
}

.message-text :deep(li) {
  @apply text-gray-800 dark:text-gray-200;
}

.message-actions {
  @apply flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity;
}

.chat-message:hover .message-actions {
  @apply opacity-100;
}

.action-btn {
  @apply p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors;
}
</style>