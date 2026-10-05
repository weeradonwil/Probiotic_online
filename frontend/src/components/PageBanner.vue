<script setup>defineProps({ title: String, subtitle: String })</script>
<template><section class="page-banner"><div class="page-shell"><nav class="breadcrumb" aria-label="เส้นทางหน้า"><RouterLink to="/">หน้าแรก</RouterLink><span>›</span><span>{{ title }}</span></nav><h1>{{ title }}</h1><p>{{ subtitle }}</p></div></section></template>
