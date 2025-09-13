<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      Search Results
      <span v-if="results.length > 0" class="ml-2 text-sm font-normal text-gray-500">
        ({{ results.length }} matches)
      </span>
    </h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
      <p class="text-gray-600 text-sm">Searching for similar faces...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="results.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <h4 class="text-lg font-medium text-gray-900 mb-2">No search performed yet</h4>
      <p class="text-gray-600 text-sm max-w-sm">
        Upload an image in the search section to find similar faces in the database.
      </p>
    </div>

    <!-- Results Grid -->
    <div v-else class="space-y-4 max-h-96 overflow-y-auto">
      <div 
        v-for="result in results" 
        :key="result.faceId"
        class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <!-- Thumbnail -->
        <div class="flex-shrink-0">
          <img 
            :src="result.thumbUrl" 
            :alt="`Match ${result.imageId}`"
            class="w-16 h-16 object-cover rounded-lg border border-gray-200"
          />
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-900 truncate">
              {{ result.externalId || `Image ${result.s3Key.split('/').pop().slice(0, 8)}` }}
            </h4>
            <SimilarityBadge :confidence="result.similarity" :label="getSimilarityLabel(result.similarity)" />
          </div>
          
          <div class="flex items-center space-x-4 text-xs text-gray-500">
            <span class="flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z"></path>
              </svg>
              ID: {{ result.s3Key.split('/').pop().slice(0, 8) }}...
            </span>
            <span class="flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              {{ result.similarity.toFixed(1) }}%
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex-shrink-0">
          <button 
            @click="viewDetails(result)"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="View details"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Results Summary -->
    <div v-if="results.length > 0" class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm text-gray-600">
        <span>{{ results.length }} similar faces found</span>
        <div class="flex items-center space-x-2">
          <span class="text-xs">Sorted by similarity</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  results: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view-details'])

const viewDetails = (result) => {
  emit('view-details', result)
}

// Generate similarity label based on confidence
const getSimilarityLabel = (similarity) => {
  if (similarity >= 95) return 'Very Similar'
  if (similarity >= 90) return 'Similar'
  if (similarity >= 80) return 'Possibly Similar'
  return 'Low Similarity'
}
</script>