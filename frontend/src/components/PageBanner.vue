<script setup>
defineProps({ title: String, subtitle: String, image: String })
</script>

<template>
  <section
    class="page-banner"
    :class="{ 'page-banner-art': image }"
    :style="image ? { '--banner-image': `url('${image}')` } : undefined"
  >
    <div class="page-shell">
      <nav class="breadcrumb" aria-label="เส้นทางหน้า">
        <RouterLink to="/">หน้าแรก</RouterLink><span>›</span><span>{{ title }}</span>
      </nav>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>
  </section>
</template>
