<script setup>
import PageBanner from '../components/PageBanner.vue'
import Icon from '../components/Icon.vue'
const members = [{ name: 'นาย วีรดนย์ วิลัยมาตย์', id: '116710906045-5' }, { name: 'นาย สุรชัย พูลชาติ', id: '116710906039-8' }, { name: 'นาย อัครวินท์ ดีจิวารณ์', id: '116710906057-0' }]
// ไม่มีอีเมล/ที่อยู่ร้านที่ยืนยันแล้ว จึงใช้ข้อมูลสถาบันตามรายงานและไม่แสดงข้อมูลสมมติจากภาพ
</script>
<template><PageBanner class="contact-page-banner" image="/images/contact-banner-wellness.png" title="ติดต่อเรา" subtitle="ข้อมูลโครงงานและสมาชิกผู้จัดทำ" /><section class="page-shell section contact-page">
    <div class="contact-grid contact-grid-single"><article class="panel"><h2>ข้อมูลโครงงาน</h2><div class="contact-row"><span class="circle-icon"><Icon name="pin" /></span><div><strong>สถาบัน</strong><p>มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี</p></div></div><div class="contact-row"><span class="circle-icon"><Icon name="order" /></span><div><strong>รายวิชา 09143322</strong><p>การพัฒนาระบบงานฐานข้อมูลโดยโปรแกรมประยุกต์</p></div></div><div class="contact-row"><span class="circle-icon"><Icon name="clock" /></span><div><strong>ภาคการศึกษา</strong><p>ภาคเรียนที่ 1 ปีการศึกษา 2569</p></div></div><div class="contact-members"><h2 class="contact-members-title">สมาชิกผู้จัดทำ</h2><div class="contact-members-grid"><article v-for="member in members" :key="member.id" class="contact-member"><span class="circle-icon"><Icon name="user" :size="22" /></span><div><h3>{{ member.name }}</h3><p>{{ member.id }}</p></div></article></div></div></article>
  </div>
    <div class="contact-channels">
      <div class="contact-channels-heading">
        <div><span class="contact-eyebrow">CONTACT OPTIONS</span><h2>ช่องทางติดต่อ</h2></div>
      </div>
      <div class="contact-channel-grid">
        <a class="contact-channel" href="mailto:contact@example.com"><span class="contact-channel-icon"><Icon name="mail" /></span><span class="contact-channel-copy"><strong>อีเมล</strong><span>contact@example.com</span></span><Icon name="arrow" :size="18" /></a>
        <div class="contact-channel"><span class="contact-channel-icon"><Icon name="phone" /></span><span class="contact-channel-copy"><strong>โทรศัพท์</strong><span>02-000-0000</span></span></div>
        <div class="contact-channel"><span class="contact-channel-icon"><Icon name="user" /></span><span class="contact-channel-copy"><strong>LINE</strong><span>@probioticshop-demo</span></span></div>
      </div>
    </div>

</section></template>
