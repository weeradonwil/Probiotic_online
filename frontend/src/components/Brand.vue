<script setup>
import Icon from './Icon.vue'
defineProps({ admin: Boolean })
</script>
<template><RouterLink :to="admin ? '/admin' : '/'" class="brand"><Icon name="leaf" :size="38" /><span><strong>Probiotic <span>{{ admin ? 'Admin' : 'Shop' }}</span></strong><small>{{ admin ? 'Store Management' : 'Good Bacteria · Better Life' }}</small></span></RouterLink></template>
