# ตรวจ frontend ด้วย Chromium แบบ headless

`node frontend/tests/browser/steam-gallery.cjs` ตรวจเว็บ GameMatch ที่ Deploy แล้วโดยไม่แก้ข้อมูล: คลังอย่างน้อย 100 เกม/ชุดยอดนิยม 100 เกม รูปจริงครบทุกหน้าที่ 1366/390/320px ค้นหาแล้วกลับหน้าแรก เรียงชื่อ ลิงก์/วันที่ Steam และไม่มี overflow หรือ page error ผลอยู่ใน `docs/evidence/steam-browser/` ต้องเตรียม Playwright แยกจาก application ตามด้านล่างก่อนรัน

`verify.cjs` เปิด production build บนพอร์ตว่างของ localhost และสร้าง browser context ใหม่ ไม่เปิดหน้าต่าง ไม่ใช้โปรไฟล์เบราว์เซอร์หรือควบคุมจอของผู้ใช้ เมื่อจบจะปิดเฉพาะ server/browser ที่สคริปต์สร้างเอง

API และภาพทั้งหมดในชุดนี้เป็น fixtures ชื่อ `Demo:` ที่ดักเฉพาะใน context ทดสอบ ผล reload หมายถึงข้อมูลใน mock store ยังอยู่ ไม่ใช่หลักฐาน PostgreSQL persistence หรือสิทธิ์ของ Go

เครื่องมือนี้เป็น QA แยกจาก application ไม่เพิ่ม Playwright ใน dependencies ของ CRA และไม่เปลี่ยน stack ที่ใช้เรียน ส่วน React assertions หลักยังอยู่ใน `src/tests/` และรันด้วย `npm run check`

รันจากโฟลเดอร์โปรเจกต์ `F:\gamematch-basic` ด้วย PowerShell:

```powershell
npm install --prefix .tools/frontend-qa --no-save --package-lock=false playwright@1.65.0
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.cache/playwright"
node .tools/frontend-qa/node_modules/playwright/cli.js install chromium --only-shell
npm --prefix frontend run build
node frontend/tests/browser/verify.cjs
```

ผลและ screenshots เขียนใน `docs/evidence/frontend-browser/` ให้ดู `report.json` โดยต้องมี `status: passed` และไม่มี `pageErrors` สคริปต์ exit ด้วยรหัสที่ไม่ใช่ศูนย์เมื่อ assertion ล้มเหลว

ตรวจหน้า Guest ที่ 1366×900, 390×844 และ 320×720; ฟอร์ม Login/Register; การกรองเกมโดยไม่ fetch ซ้ำ; Quiz; Detail; ทางกลับจาก 404; Favorites; Preferences; Profile/Password; Admin CRUD/visibility/Sync error; native storage event เมื่อ logout ข้ามแท็บ; Loading/Empty/Error/retry และชื่อสมาชิกยาว 100 ไบต์ที่ไม่มีช่องว่าง

ยังต้องตรวจ browser → Go → Supabase และ URLs ที่ Deploy จริงแยกต่างหาก ก่อนอ้างว่าระบบพร้อมส่ง

## ทดสอบ React → Go → Supabase จริง

`live.cjs` ใช้ Go executable ที่ build ไว้และ `backend/.env` จริง ไม่มี HTTP mock สร้างบัญชี QA สองบัญชีและเกมทดสอบหนึ่งรายการ แล้วลบเฉพาะข้อมูลเหล่านั้นเมื่อจบ ต้องมี `psql` (ระบุพาธผ่าน `GM_PSQL` ได้) และสิทธิ์ backend ที่จัดการตาราง `gm_*` ได้

เตรียม dependencies/browser ตามด้านบน Build frontend และ `go build -o server.exe .` จาก `backend` จากนั้นรันที่ root:

```powershell
$env:GM_LIVE_QA = '1'
node frontend/tests/browser/live.cjs
```

พอร์ต 8080 และ 4173 ต้องว่าง สคริปต์จะหยุดหากมีโปรแกรมใช้อยู่และไม่ปิดโปรแกรมของผู้ใช้ ผลอยู่ใน `docs/evidence/live-browser/` บัญชี QA ได้สิทธิ์ Admin ชั่วคราวผ่าน SQL สำหรับทดสอบก่อนถูกลบ ไม่มี default Admin สำหรับใช้งานจริง และไม่บันทึก password/token/DB URL ในรายงาน

ตรวจเว็บที่ Deploy จริงด้วยสคริปต์เดียวกัน (ต้องเป็น DB GameMatch เดียวกับ backend/.env เพื่อ promote/cleanup เฉพาะข้อมูล QA):

```powershell
$env:GM_LIVE_QA = '1'
$env:GM_QA_WEB_URL = 'https://gamematch-projectweb-befe.vercel.app'
$env:GM_QA_API_URL = 'https://gamematch-api-hzv6.onrender.com'
node frontend/tests/browser/live.cjs
```

โหมดนี้ไม่เปิด local server/Go process และใช้ HTTPS ของจริง ผลแยกไว้ใน `docs/evidence/cloud-browser/` ไม่มี HTTP mock และไม่ใช้ browser session ของผู้ใช้

ตั้ง `$env:GM_QA_STEAM_SYNC='1'` เพิ่มเพื่อทดสอบปุ่ม Admin Steam จริง (จะอัปเดตคลังจริงโดยตั้งใจ) ชุดทดสอบเลือกเกม/คะแนนจาก API ปัจจุบัน ไม่ยึดชื่อ Demo หลังย้ายเป็น Steam

`node frontend/tests/browser/steam-gallery.cjs` ตรวจหน้าสาธารณะบน URL จริงโดยไม่แก้ข้อมูล ตรวจว่ารูป Steam ทุกใบดาวน์โหลดสำเร็จจริง พร้อมวันที่/ลิงก์ต้นทางและขนาดจอ 1366/390/320px ผลแยกใน `docs/evidence/steam-browser/`
