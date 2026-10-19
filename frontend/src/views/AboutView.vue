<script setup>
import PageBanner from '../components/PageBanner.vue'
import Icon from '../components/Icon.vue'


const values = [
  { icon: 'leaf', title: 'คัดสรรอย่างใส่ใจ', text: 'เลือกผลิตภัณฑ์ที่เหมาะกับการดูแลสุขภาพในทุกวัน' },
  { icon: 'shield', title: 'คุณภาพและความปลอดภัย', text: 'ให้ความสำคัญกับข้อมูลและมาตรฐานของสินค้า' },
  { icon: 'order', title: 'เลือกซื้อสะดวก', text: 'ค้นหาและเลือกผลิตภัณฑ์ที่ต้องการได้ง่าย' },
  { icon: 'user', title: 'ใส่ใจทุกคน', text: 'พร้อมเป็นส่วนหนึ่งของการดูแลสุขภาพของคุณ' }
]
</script>

<template>
  <PageBanner title="เกี่ยวกับ Probiotic Shop" subtitle="เราเชื่อว่าสุขภาพที่ดี เริ่มต้นจากการใส่ใจทุกวัน" />

  <main class="page-shell section about-page">
    <section class="about-story">
      <div class="about-photo-wrap">
        <img src="/images/about-story.png" alt="ผลิตภัณฑ์โปรไบโอติกท่ามกลางใบไม้สีเขียว" />
        <span class="about-photo-note"><Icon name="leaf" :size="17" /> Good Bacteria · Better Life</span>
      </div>
      <div class="about-copy">
        <span class="about-eyebrow">OUR STORY</span>
        <h2>สุขภาพที่ดี เริ่มจากการใส่ใจตัวเอง</h2>
        <p>
          Probiotic Shop มุ่งมั่นเป็นแหล่งรวมผลิตภัณฑ์ดูแลสุขภาพลำไส้และระบบทางเดินอาหาร เราคัดสรรโพรไบโอติก พรีไบโอติก และผลิตภัณฑ์เสริมอาหารที่ตอบโจทย์การดูแลสุขภาพในชีวิตประจำวัน
        </p>
        <p>
          เราเชื่อว่าการดูแลสุขภาพเริ่มต้นได้จากเรื่องง่าย ๆ ในทุกวัน จึงตั้งใจทำให้การค้นหาข้อมูลและเลือกซื้อผลิตภัณฑ์เป็นเรื่องสะดวก เพื่อให้คุณเลือกสิ่งที่เหมาะกับตัวเองและครอบครัว
        </p>
        <RouterLink to="/products" class="button button-primary about-cta">เลือกชมสินค้า <Icon name="arrow" :size="18" /></RouterLink>
      </div>
    </section>

    <section class="about-values" aria-labelledby="about-values-title">
      <header>
        <span class="about-eyebrow">OUR PROMISE</span>
        <h2 id="about-values-title">สิ่งที่เราใส่ใจ</h2>
        <p>ประสบการณ์ที่ดีเริ่มต้นจากการเลือกสิ่งที่เหมาะกับคุณ</p>
      </header>
      <div class="about-value-grid">
        <article v-for="value in values" :key="value.title" class="about-value-card">
          <span class="about-value-icon"><Icon :name="value.icon" :size="25" /></span>
          <h3>{{ value.title }}</h3>
          <p>{{ value.text }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.about-page { padding-top: 38px; padding-bottom: 54px; }
.about-story { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, .98fr); align-items: center; gap: clamp(30px, 5vw, 76px); }
.about-photo-wrap { position: relative; min-width: 0; }
.about-photo-wrap img { display: block; width: 100%; height: clamp(300px, 34vw, 470px); object-fit: cover; object-position: 70% center; border-radius: 22px; box-shadow: 0 16px 40px #173f2515; }
.about-photo-note { position: absolute; left: 18px; bottom: 18px; display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border: 1px solid #ffffffa8; border-radius: 999px; color: var(--deep); background: #fffffff0; font-size: .78rem; font-weight: 650; box-shadow: 0 4px 15px #173f2510; }
.about-copy { max-width: 650px; }
.about-eyebrow { color: #32804f; font-size: .73rem; font-weight: 750; letter-spacing: .15em; }
.about-copy h2 { margin: 9px 0 18px; font-size: clamp(1.65rem, 3vw, 2.35rem); line-height: 1.35; }
.about-copy p { margin-bottom: 14px; font-size: .95rem; line-height: 1.9; }
.about-cta { margin-top: 8px; }
.about-values { padding-top: 64px; }
.about-values > header { margin-bottom: 22px; text-align: center; }
.about-values > header h2 { margin: 6px 0; font-size: clamp(1.5rem, 2.5vw, 2rem); }
.about-values > header p { margin: 0; font-size: .88rem; }
.about-value-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.about-value-card { min-width: 0; padding: 24px 18px; border: 1px solid #e6f0e9; border-radius: 18px; background: linear-gradient(145deg, #fbfefb, #f2f9f3); text-align: center; }
.about-value-icon { display: grid; place-items: center; width: 54px; height: 54px; margin: 0 auto 14px; border: 1px solid #9bc8aa; border-radius: 50%; color: var(--green); background: white; }
.about-value-card h3 { margin: 0 0 7px; font-size: .95rem; }
.about-value-card p { margin: 0; font-size: .79rem; line-height: 1.7; }

@media (max-width: 900px) {
  .about-story { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
  .about-photo-wrap img { height: 340px; }
  .about-value-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 650px) {
  .about-page { padding-top: 24px; padding-bottom: 36px; }
  .about-story { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .about-photo-wrap img { height: 260px; border-radius: 17px; }
  .about-copy h2 { margin-bottom: 12px; }
  .about-copy p { font-size: .88rem; }
  .about-values { padding-top: 42px; }
  .about-value-grid { gap: 10px; }
  .about-value-card { padding: 18px 12px; border-radius: 15px; }
  .about-value-icon { width: 46px; height: 46px; margin-bottom: 10px; }
  .about-value-card h3 { font-size: .82rem; }
  .about-value-card p { font-size: .72rem; }
}
</style>
