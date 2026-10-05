<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({ product: Object })
const failed = ref(false)
// image ใน DB เป็นชื่อไฟล์เท่านั้น ภาพสำรองเป็นภาพประกอบ ไม่แทนรูปสินค้าจริง
const source = computed(() => props.product?.image ? '/images/products/' + encodeURIComponent(props.product.image) : '')
watch(source, () => { failed.value = false })
</script>
<template><div class="product-photo"><img v-if="source && !failed" :src="source" :alt="product.name" @error="failed = true" loading="lazy" /><template v-else><img src="/images/botanical-hero.png" alt="ภาพประกอบผลิตภัณฑ์" class="illustration" loading="lazy" /><small>ภาพประกอบ</small></template></div></template>
