<script setup>
import Icon from './Icon.vue'
import ProductImage from './ProductImage.vue'
import { cart } from '../cart'
import { money } from '../format'
defineProps({ product: Object })
</script>
<template><article class="product-card"><RouterLink :to="'/products/' + product.product_id" class="product-image-link" :aria-label="'ดูรายละเอียด ' + product.name"><ProductImage :product="product" /></RouterLink><div class="product-info"><small class="product-category">{{ product.category_name }}</small><RouterLink :to="'/products/' + product.product_id"><h3>{{ product.name }}</h3></RouterLink><p class="product-description">{{ product.description }}</p><strong class="product-price">{{ money(product.price) }}</strong><span :class="['stock-label', { 'stock-out': !product.stock }]">● {{ product.stock ? 'มีสินค้า' : 'สินค้าหมด' }}</span><button class="button button-primary" :disabled="!product.stock" @click="cart.add(product)"><Icon name="cart" :size="19" />{{ product.stock ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด' }}</button></div></article></template>
