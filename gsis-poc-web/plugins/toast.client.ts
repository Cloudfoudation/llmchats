export default defineNuxtPlugin(() => {
  const toast = {
    success: (message: string) => {
      console.log('✅ Success:', message)
      // In a real app, you'd use a proper toast library like vue-toastification
      alert(`Success: ${message}`)
    },
    error: (message: string) => {
      console.error('❌ Error:', message)
      alert(`Error: ${message}`)
    },
    info: (message: string) => {
      console.log('ℹ️ Info:', message)
      alert(`Info: ${message}`)
    }
  }

  return {
    provide: {
      toast
    }
  }
})