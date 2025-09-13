<template>
  <div class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('close')">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <!-- Modal panel -->
      <div 
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              Image Details
            </h3>
            <button 
              @click="$emit('close')"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Image -->
          <div class="mb-4">
            <img 
              :src="image.thumbUrl" 
              :alt="`Image ${image.imageId}`"
              class="w-full h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
              @error="handleImageError"
            />
          </div>

          <!-- Details -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Image ID:</span>
              <span class="text-sm text-gray-900 font-mono">{{ image.imageId }}</span>
            </div>

            <div v-if="image.personId" class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Person ID:</span>
              <span class="text-sm text-gray-900">{{ image.personId }}</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Consent:</span>
              <span class="inline-flex items-center">
                <svg 
                  class="w-4 h-4 mr-1"
                  :class="image.consent ? 'text-green-600' : 'text-red-600'"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    v-if="image.consent"
                    fill-rule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                    clip-rule="evenodd" 
                  />
                  <path 
                    v-else
                    fill-rule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                    clip-rule="evenodd" 
                  />
                </svg>
                <span 
                  class="text-sm"
                  :class="image.consent ? 'text-green-800' : 'text-red-800'"
                >
                  {{ image.consent ? 'Granted' : 'Not granted' }}
                </span>
              </span>
            </div>

            <div v-if="image.facesCount !== undefined" class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Faces Detected:</span>
              <span class="text-sm text-gray-900">{{ image.facesCount }}</span>
            </div>

            <div v-if="image.confidence" class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Similarity:</span>
              <SimilarityBadge :confidence="image.confidence" :label="image.similarityLabel" />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="$emit('close')"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  image: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const handleImageError = (event) => {
  console.error('Failed to load image:', event)
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZsNC41ODYtNC41ODZhMiAyIDAgMDEyLjgyOCAwTDE2IDE2bS0yLTJsMS41ODYtMS41ODZhMiAyIDAgMDEyLjgyOCAwTDIwIDE0bS02LTZoLjAxTTYgMjBoMTJhMiAyIDAgMDAyLTJWNmEyIDIgMCAwMC0yLTJINmEyIDIgMCAwMC0yIDJ2MTJhMiAyIDAgMDAyIDJ6IiBzdHJva2U9IiM5Q0E3QjciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo='
}
</script>