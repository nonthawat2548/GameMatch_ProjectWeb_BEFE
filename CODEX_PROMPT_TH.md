ผมต้องการให้คุณรับช่วงทำโปรเจกต์ GameMatch ในโฟลเดอร์นี้จนพร้อมส่ง Term Project วิชา BE–FE ภายในวันที่ 14 พฤศจิกายน 2569 อ่าน AGENTS.md และ README.md ก่อน แล้วอ่าน docs/HANDOFF.md, docs/API.md, docs/RUBRIC.md, docs/VALIDATION.md

เป้าหมายคือเว็บแนะนำเกมตามความชอบ แนวเกม และสไตล์การเล่น มี Guest / Member / Admin ครบ และมีหลักฐานตรงเกณฑ์เต็ม 20 คะแนน ไม่ใช่แค่เปลี่ยน MovieHub เป็นเกม

ใช้ Stack และวิธีที่เรียนเท่านั้น: React แบบ Create React App + Router + Context + Fetch + Tailwind 3; Go net/http + JWT + bcrypt + Middleware + pgxpool; PostgreSQL บน Supabase ไม่ใช้ Supabase Auth; FE Deploy Vercel และ BE Deploy Render แบบเชื่อม GitHub

ตรวจโค้ดที่เรียนจริงใน https://github.com/nonthawat2548/moviehub-670710207 และ https://github.com/nonthawat2548/week6-lab ก่อนปรับโครงสร้าง อย่าเปลี่ยนเป็น Vite, Next.js, Express, Prisma หรือเพิ่มระบบ AI ที่ไม่เรียน

ให้ลงมือทำจริงตามลำดับ:
1. ตรวจไฟล์ ติดตั้ง dependencies สร้าง lockfiles และรัน tests/build ทั้ง FE/BE แก้บั๊กให้ผ่าน
2. ตรวจ SQL ในฐานข้อมูล GameMatch แยกจาก MovieHub ตั้ง environment ให้ถูก และทดสอบ Register/Login/Logout/Profile/Change password กับ DB จริง
3. ทดสอบ Guest ดูเกมและตอบ Quiz; Member บันทึก Preference/Favorites ได้เฉพาะตนเอง; Member เรียก Admin API ต้อง 403; Guest เรียก Member API ต้อง 401
4. เชื่อม RAWG_API_KEY ฝั่ง Go แล้วใช้ Admin Sync ดึงข้อมูลเกมจริง เก็บลง DB ให้เว็บใช้งานต่อได้เมื่อ RAWG ล่ม อย่าเดา Free/Paid หรือเวลาเล่นต่อครั้งจาก Tags/Playtime ปุ่ม Sync ปัจจุบันดึงหน้าแรก 40 เกมเท่านั้น ถ้าขยายต้องทำ pagination แบบจำกัดจำนวนและคุม quota
5. ตรวจ Algorithm ตามกฎ Genre45 + Mode25 + Style30 และเหตุผลบน UI ไม่เรียกคะแนนนี้ว่าความน่าจะเป็นที่จะชอบเกม
6. ปรับ UI Gaming Theme สีกรมท่า/ม่วงให้สะอาด responsive และมี Loading/Empty/Error ที่ใช้งานจริง
7. เพิ่ม integration tests ที่จำเป็น ตรวจ authorization และ login throttling แล้วเก็บหลักฐานผลรัน
8. เตรียม Deploy โดยตั้ง root directory frontend/backend ใน Vercel/Render ตาม README ผมจะให้ credentials ที่ขาดเมื่อจำเป็น ห้าม overwrite โปรเจกต์เก่า
9. อัปเดตเอกสาร API, README, คู่มือ Demo และบทพูดคลิปไม่เกิน 15 นาที โดยแบ่งงาน FE/BE ให้สมาชิก 2 คนได้อธิบายทั้งโค้ดและปัญหาที่ตัวเองแก้

ผมขอให้ทำงานต่อจนได้ผลที่ทดสอบได้ ไม่จบแค่เสนอแผน ไม่ให้ผมมานั่งประกอบโค้ดเองทีละส่วน หากติดข้อจำกัดให้ระบุสิ่งที่ทำแล้ว สิ่งที่ยังตรวจไม่ได้ และข้อมูลที่จำเป็นจริง ๆ ห้ามอ้างว่าผ่าน tests/deploy แล้วถ้ายังไม่ได้รัน
