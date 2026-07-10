<script setup lang="ts">
const skeletonizer = useSkeletonizer()

// Simulate a slow request so the skeleton is visible on first load.
const loading = ref(true)
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 2500)
})
</script>

<template>
  <main style="max-width: 640px; margin: 3rem auto; font-family: system-ui;">
    <h1>Nuxt Skeletonizer playground</h1>

    <div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
      <button @click="loading = true">
        Show skeleton
      </button>
      <button @click="loading = false">
        Show content
      </button>
      <button @click="skeletonizer.toggle()">
        Toggle global
      </button>
    </div>

    <p>Global enabled: {{ skeletonizer.isEnabled.value }} · bones: {{ skeletonizer.stats.bones }}</p>

    <!-- Automatic skeletonization of arbitrary markup -->
    <Skeletonizer :enabled="loading">
      <article style="display: flex; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid #eee; border-radius: 12px;">
        <img
          src="https://i.pravatar.cc/72"
          width="72"
          height="72"
          style="border-radius: 9999px;"
        >
        <div>
          <h2 style="margin: 0;">
            Jane Doe
          </h2>
          <p style="margin: 0.25rem 0 0; color: #555;">
            Principal engineer · loves skeletons that never shift the layout.
          </p>
          <button v-skeleton-ignore style="margin-top: 0.5rem;">
            Always visible
          </button>
        </div>
      </article>
    </Skeletonizer>

    <h3 style="margin-top: 2rem;">
      Manual primitives
    </h3>
    <SkeletonCard media avatar :lines="3" footer />
    <div style="margin-top: 1rem;">
      <SkeletonList :items="3" :lines="2" />
    </div>
  </main>
</template>
