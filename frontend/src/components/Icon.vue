<script setup>
defineProps({ name: { type: String, default: 'leaf' }, size: { type: [Number, String], default: 22 } })
// ใช้ไอคอน SVG ชุดเดียวกันทุกหน้า เพื่อให้ขนาดและเส้นสม่ำเสมอโดยไม่เพิ่ม dependency
const paths = {
  leaf: 'M20 3C9 2 3 7 5 15c8 4 15-2 15-12ZM5 21 16 8M5 15C1 11 1 7 2 5c4 0 7 1 9 3',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  user: 'M20 21v-3a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v3ZM16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  cart: 'M2 3h3l3 12h11l3-9H6M10 20h.01M18 20h.01',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm6 6 12 12M6 18 18 6',
  lock: 'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  mail: 'M3 5h18v14H3ZM3 5l9 8 9-8',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6',
  box: 'm12 2 9 5v10l-9 5-9-5V7ZM3 7l9 5 9-5M12 12v10M7 4.5l9 5',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  order: 'M6 3h12v18H6ZM9 8h6M9 12h6M9 16h3',
  payment: 'M2 5h20v14H2ZM2 10h20M5 15h4',
  logout: 'M9 3H3v18h6M9 12h13m-5-5 5 5-5 5',
  plus: 'M12 4v16M4 12h16',
  edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
  trash: 'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  check: 'm4 12 5 5 11-11',
  truck: 'M1 4h14v12H1ZM15 8h5l3 5v3h-8M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  phone: 'M5 2 2 5c0 9 8 17 17 17l3-3-5-4-3 3c-4-2-6-4-8-8l3-3Z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.leaf" /></svg></template>
