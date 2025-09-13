<template>
  <span 
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="badgeClasses"
  >
    <svg class="w-3 h-3 mr-1" :class="iconClasses" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    {{ label }}
  </span>
</template>

<script setup>
const props = defineProps({
  confidence: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  }
})

const badgeClasses = computed(() => {
  if (props.confidence >= 95) {
    return 'bg-green-100 text-green-800'
  } else if (props.confidence >= 90) {
    return 'bg-blue-100 text-blue-800'
  } else {
    return 'bg-yellow-100 text-yellow-800'
  }
})

const iconClasses = computed(() => {
  if (props.confidence >= 95) {
    return 'text-green-600'
  } else if (props.confidence >= 90) {
    return 'text-blue-600'
  } else {
    return 'text-yellow-600'
  }
})
</script>