export const money = (value) => Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })
export const date = (value) => value ? new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
