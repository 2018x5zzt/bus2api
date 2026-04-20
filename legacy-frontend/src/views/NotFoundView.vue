<!-- 404 Not Found page -->
<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1 class="not-found-code">404</h1>
      <p class="not-found-text">Page not found</p>
      <RouterLink to="/dashboard" class="btn-primary">
        Back to Dashboard
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
}

.not-found-content {
  text-align: center;
}

.not-found-code {
  font-size: 72px;
  font-weight: 800;
  color: var(--color-text-muted);
  letter-spacing: -0.04em;
  margin-bottom: 8px;
}

.not-found-text {
  font-size: 18px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}
</style>
