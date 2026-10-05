<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
defineProps({ modelValue: String, label: String, id: String, autocomplete: { type: String, default: 'new-password' } })
const emit = defineEmits(['update:modelValue'])
const visible = ref(false)
</script>
<template><label :for="id" class="field-label">{{ label }}</label><div class="input-icon"><Icon name="lock" /><input :id="id" :value="modelValue" @input="emit('update:modelValue', $event.target.value)" :type="visible ? 'text' : 'password'" :autocomplete="autocomplete" :placeholder="label" required /><button type="button" :aria-label="visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'" :aria-pressed="visible" @click="visible = !visible"><Icon name="eye" /></button></div></template>
