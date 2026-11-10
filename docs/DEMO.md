# คู่มือ Demo และบทพูด GameMatch — เป้าหมาย 14:30 นาที

สถานะ 10 พ.ย. 2569: ใช้เป็นบทซ้อมและรายการเก็บหลักฐาน ยังไม่ใช่หลักฐานว่าระบบ production ผ่านแล้ว เติมชื่อสมาชิกและ URLs หลังตรวจจริง ห้ามแสดง secrets, token หรือรหัสผ่านในคลิป

## ก่อนอัด

1. สร้าง Supabase GameMatch แยกจาก MovieHub รัน schema และตั้ง DATABASE_URL/JWT_SECRET ฝั่ง Go เท่านั้น Go ไม่อ่าน .env อัตโนมัติ
2. ตั้ง RAWG_API_KEY ฝั่ง Go, sync ด้วย admin แล้วตรวจเครดิต RAWG บนหน้าที่ใช้ข้อมูล อย่าเรียก Demo fixtures ว่าเกมจริง
3. เปิด FE/BE ที่ deploy แล้ว ตรวจ healthz และ refresh หน้า /games/ID โดยตรง
4. เตรียมสมาชิก A/B และ admin ที่สมัครเอง ตรวจ 401/403 จาก API จริง และ favorites/preferences หลัง reload
5. รัน `npm run check` ฝั่ง frontend (รวม format/test/build) และ Go test/vet/build เก็บผลใหม่ก่อนอัด

## บทพูดและภาพที่ควรแสดง

| เวลา | ผู้พูด | เนื้อหา/ภาพ |
|---|---|---|
| 00:00–00:45 | ทั้งสองคน | “พวกเรา [ชื่อ FE] และ [ชื่อ BE] ทำ GameMatch เพื่อช่วยเลือกเกมจากแนว รูปแบบ และสไตล์การเล่น ใช้ React, Go และ PostgreSQL” |
| 00:45–02:00 | FE | เปิด Discover ค้นหาเกม ดู detail และตอบ Quiz อธิบาย 45/25/30 เป็นคะแนนตามกฎจาก metadata ไม่ใช่ความน่าจะเป็นหรือ AI |
| 02:00–03:30 | BE | สมัคร/ล็อกอิน member บันทึกเกมและความชอบ reload แล้วตรวจว่ายังอยู่; admin เพิ่ม แก้ ซ่อน ลบเกม แล้วตรวจหน้าสาธารณะ |
| 03:30–05:30 | FE | เปิด Discover.jsx และ MatchQuiz.jsx: useState เก็บฟอร์ม/ผล/สถานะ; useEffect โหลดข้อมูลและ cleanup ยกเลิกคำขอเก่า; backend.js ใช้ fetch + JSON |
| 05:30–07:30 | FE | เปิด AuthContext และ ProtectedRoute: Context กู้บัญชีจาก /api/me หลัง reload; client route ช่วย UX ส่วน Go เป็นผู้บังคับสิทธิ์ แสดง tests ของ Quiz และ Favorites |
| 07:30–09:30 | BE | เปิด Routes, Guard, token.go: JWT HS256 หมดอายุ 2 ชั่วโมง; bcrypt; role/token_version ตรวจจาก DB; logout/เปลี่ยนรหัสผ่านยกเลิกทุก session |
| 09:30–11:30 | BE | เปิด SQL Favorites ที่ใช้ member ID จาก JWT และ parameterized SQL; score.go จัดอันดับ top 5 แบบ deterministic; Sync เก็บข้อมูลใน transaction และคงคำอธิบาย/สถานะของ admin |
| 11:30–13:30 | ทั้งสองคน | แสดงผล tests จริง; Guest /api/me = 401; Member admin API = 403; บัญชี B ไม่เห็น/ลบ favorites ของ A; loading/error/retry และ empty state |
| 13:30–14:30 | ทั้งสองคน | แสดง FE URL, BE /healthz, GitHub และสรุปขอบเขตที่ตรวจจริง พร้อมข้อจำกัดที่ยังมี |

## ตัวอย่างปัญหาที่อธิบายได้จากการแก้ในรอบนี้

- FE: หน้า Quiz เดิมคงผลเก่าไว้ระหว่างร้องขอใหม่/เมื่อเกิด error ทำให้สับสนว่าเป็นผลของตัวเลือกใหม่ แก้ด้วยการล้าง games ตอนเปลี่ยนตัวเลือกและเริ่ม request มี test ยืนยันผลเดิมหายเมื่อ request ใหม่ล้มเหลว
- FE: เดิมคำค้นหาใช้คำขอ API ทุกครั้งที่พิมพ์ ภายหลังปรับตาม Movies ของตัวอย่างวิชาให้ useEffect โหลดรายการหนึ่งรอบ แล้วคำนวณ shown จาก state ของคำค้นและแนวเกม มี cleanup กันคำตอบหลังออกจากหน้า และเทสยืนยันว่าพิมพ์/เลือกแนวไม่ส่ง API เพิ่ม
- FE: maxLength ของช่องกรอกนับต่างจาก UTF-8 bytes ที่ Go/bcrypt ใช้ จึงเพิ่มตัวช่วยตรวจจำนวน bytes ของข้อความไทยก่อนส่งฟอร์ม พร้อม tests ที่ยืนยันว่ารหัสผ่านไทย 25 ตัว (75 bytes) ถูกปฏิเสธโดยไม่ยิง API
- FE: การสมัครอาจสำเร็จแต่ auto-login ล้มเหลว เดิมผู้ใช้เสี่ยงกดสมัครซ้ำจนเจออีเมลซ้ำ แก้ด้วยการนำไปหน้า Login พร้อมข้อความว่าสมัครสำเร็จแล้ว
- FE: กดบันทึกจากรายละเอียดเกมแล้วล็อกอิน เดิมต้องกลับไปหาเกมใหม่ ตอนนี้เก็บหน้าที่ต้องการใน Router state และกลับมาหน้าเดิมหลังล็อกอิน โดยตรวจว่าปลายทางเป็นหน้าภายในแอปจริง
- FE: เดิม user ใน Context ยังแสดงอยู่หลัง protected API ตอบ 401 และไม่รู้ว่ามีการเปลี่ยนบัญชีในอีกแท็บ แก้ด้วย session-expired event และ storage event แล้วตรวจ /api/me ใหม่ พร้อมเทสกันคำตอบของ session เก่าทับบัญชีใหม่ ผลเทสใช้ HTTP/event จำลอง ต้องเดโมข้ามแท็บกับระบบจริงอีกครั้งหลังเชื่อม DB
- BE: ให้สมาชิกฝั่ง BE เติมปัญหาที่ตนได้ตรวจและแก้จริงในรอบเชื่อม DB/สิทธิ์/RAWG ไม่อ้างว่าเพิ่ม login throttling หรือผ่าน integration แล้วในตอนนี้

ให้สมาชิกอ่านและทำความเข้าใจสิ่งที่ตนอธิบาย ไม่อ้างว่าคนใดเป็นผู้แก้ส่วนที่ยังไม่ได้ลงมือเอง

## หลักฐานที่ยังต้องเก็บ

DB persistence, ownership 2 บัญชี, constraints, token invalidation, role changes, RAWG deduplication/rollback, desktop/mobile screenshots และ production nested-route refresh ยังต้องทดสอบจริง จดวันที่ ผลที่คาดหวัง ผลที่ได้ และไฟล์หลักฐานลง VALIDATION.md
