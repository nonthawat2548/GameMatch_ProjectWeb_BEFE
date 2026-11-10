# GameMatch — BE–FE Starter

โปรเจกต์พื้นฐานเว็บแนะนำเกม: React + Go net/http + PostgreSQL ครบเส้นทาง Guest / Member / Admin มี SQL, RAWG sync และพรอมต์ส่งต่องานให้ Codex

**สถานะ:** Deploy ครบ Vercel + Render เชื่อม Repo + Supabase และตรวจระบบจริงผ่านเว็บแล้ว เปิด https://gamematch-projectweb-befe.vercel.app ได้เลย นำเข้าเกมจริงพร้อมภาพ/วันที่จาก Steam New Releases แล้ว 12 เกม และซ่อน Demo เดิมโดยไม่ลบข้อมูล RAWG ยังเป็นแหล่งเสริมที่ต้องตั้ง key ดูหลักฐาน/ข้อจำกัดใน docs/VALIDATION.md

อัปเดต 10 พ.ย. 2569: frontend ผ่าน format, 13 suites / 82 tests และ production build; headless QA ผ่านทั้ง API จำลองและเส้นทาง React → Go → Supabase จริง รวมสมัครสมาชิก รายการโปรดสองบัญชี Preferences, Profile/Password และ Admin ไม่มีการเปิดหน้าต่างหรือควบคุมจอผู้ใช้ สร้าง `gamematch-db` ใหม่ตามที่ผู้ใช้ยืนยัน โดยไม่แตะ MovieHub และใช้ repo `nonthawat2548/GameMatch_ProjectWeb_BEFE` ผล Go/DB และข้อจำกัดอยู่ใน `docs/evidence/`

## เปิดให้ Codex ทำต่อ
1. แตก ZIP แล้วเปิดโฟลเดอร์ gamematch-basic ใน VS Code / Codex
2. ส่งข้อความทั้งหมดใน `CODEX_PROMPT_TH.md` ให้ Codex
3. `AGENTS.md` อธิบายข้อกำหนดอาจารย์และขอบเขตงานสำหรับ agent อยู่แล้ว

## สิ่งที่มี
- Discover ค้นหาเกม, รายละเอียด, Quiz พร้อม Match Score และเหตุผล
- หน้าแรก `/`, รายการเกม `/discover` และเกี่ยวกับ `/about` แยกกันตามโครงตัวอย่างวิชา ใช้ฟอนต์ Prompt และข้อมูลเกมของ GameMatch
- สมัคร/เข้า/ออกระบบ, JWT + bcrypt, Profile, เปลี่ยนรหัสผ่าน
- Favorites รายบุคคล, บันทึก Preference
- Admin เพิ่ม/แก้/ลบ/ซ่อนเกม; Sync RAWG 40 เกมหน้าแรก
- Admin อัปเดต Steam New Releases สูงสุด 12 เกมต่อครั้ง พร้อมภาพ แท็ก วันที่ และลิงก์ร้าน ไม่ต้องใช้ RAWG key; ล้มเหลวจะไม่เขียนข้อมูลบางส่วน
- React Tests ของ Quiz และ Route authorization; Go scoring tests
- React tests ของ Admin CRUD/Sync, Register/Login/Profile/Favorites, การตรวจ UTF-8 bytes และเส้นทางใช้งานทั้ง App
- Tailwind 3 + custom CSS, responsive พื้นสว่าง ตัวอักษรกรมท่า แต้มสีม่วง อิงโครงเรียบแบบ MovieHub ตามที่ผู้ใช้ขอ ไม่ใช้ Vite
- SQL แยกชื่อ `gm_*` จาก MovieHub ไม่ใช้ Supabase Auth

## 1. เตรียมฐานข้อมูล
ใช้ PostgreSQL/Supabase ใหม่สำหรับ GameMatch รัน `database/schema.sql` ใน SQL Editor แล้วรัน `database/seed.sql` หากต้องการ fixtures ทดสอบ (4 เกมสมมติชื่อ Demo:) SQL นี้มีบทบาท anon/authenticated จึงเขียนสำหรับ Supabase โดยตรง; บน local PostgreSQL ปกติให้สร้าง roles เทียบเท่าหรือข้ามเฉพาะ REVOKE ส่วนนั้น

RLS เปิดไว้ทุกตารางและไม่อนุญาต Browser Data API เข้าถึง โดย Go ใช้ trusted DB role ที่มีสิทธิ์อ่าน/เขียน เช่น connection ที่ Supabase ให้ใน Connect ไม่ใช้ anon key บน FE

## 2. รัน Backend — Go 1.25+ (ตรวจด้วย 1.27.3)
Go ไม่อ่านไฟล์ .env อัตโนมัติ ต้องตั้งค่าใน terminal หรือ Render

บนเครื่องที่ตั้ง `backend/.env` ไว้แล้ว เปิด terminal ที่ root แล้วรัน:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
```

สคริปต์อ่าน environment เป็นข้อความ ไม่ execute เนื้อหาไฟล์ แล้วเรียก Go ตามปกติ ค่าจริงถูก gitignore; เครื่องใหม่ให้คัดลอก `backend/.env.example` มาตั้งค่าเอง หรือใช้ terminal env ตามด้านล่าง

PowerShell (เปิด terminal แรก):
```powershell
cd backend
$env:DATABASE_URL = 'YOUR_SUPABASE_POSTGRES_CONNECTION_STRING'
$env:JWT_SECRET = 'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS'
$env:ALLOWED_ORIGINS = 'http://localhost:3000'
# ไม่ต้องมี RAWG key หากทดสอบด้วย fixtures ก่อน
$env:RAWG_API_KEY = 'YOUR_RAWG_API_KEY'
go mod tidy
go fmt ./...
go test ./...
go vet ./...
go run .
```
Bash: ใช้ `export DATABASE_URL='...'` และ `export JWT_SECRET='...'` แทน `$env:`
Backend port เริ่มต้น 8080. `GET http://localhost:8080/healthz` ต้องได้ status ok เมื่อ DB เชื่อมสำเร็จ

Supabase: เลือก connection string จากหน้า Connect ให้ตรงเครือข่าย ใช้ session pooler หากเครื่องไม่มี IPv6; ใส่ `sslmode=require` และ URL-encode ตัวอักษรพิเศษในรหัสผ่าน อย่าเอา URL นี้ใส่ React

## 3. รัน Frontend — Node 20/22 แนะนำ
PowerShell terminal ที่สอง:
```powershell
cd frontend
Copy-Item .env.example .env.local
npm install --legacy-peer-deps
npm start
```
เปิด http://localhost:3000
CRA ecosystem เก่าอาจมี peer dependency conflict กับ React 19 จึงใช้ legacy-peer-deps ตามรูปแบบนี้ ไม่เปลี่ยน framework เอง มี package-lock.json แล้ว ใช้ npm ci --legacy-peer-deps เพื่อติดตั้งซ้ำตรงรุ่น และให้ Codex ตรวจเทียบ repo วิชาก่อนเปลี่ยน dependencies

Tests/build:
```powershell
npm test -- --watchAll=false
npm run build
npm run format
npm run format:check
npm run check
```

`npm run check` ตรวจ format → React tests → production build ตามลำดับ และหยุดเมื่อขั้นใดไม่ผ่าน หน้ารายการโหลดเกมจาก Go แล้วค้นหา/เลือกแนวด้วย state ในเครื่องตามตัวอย่าง MovieHub; กดพิมพ์ไม่ส่ง API ใหม่ทุกตัวอักษร ไม่มี cache รายวันเพื่อให้เปิดหน้าใหม่แล้วเห็นการแก้ข้อมูลของ Admin

## 4. สร้าง Admin และนำเข้าเกมจริง
- หน้า Admin มีปุ่ม **อัปเดตเกมออกใหม่ Steam** ใช้ได้ทันทีโดยไม่ต้องมี RAWG key นำเข้า New Releases สูงสุด 12 เกมต่อรอบ พร้อมภาพ landscape, วันที่วางจำหน่าย และลิงก์ต้นทาง เป็นการกดอัปเดตเอง ไม่ใช่การดึงอัตโนมัติทุกครั้งที่ผู้ชมเปิดเว็บ
- สมัครสมาชิกผ่านเว็บ ไม่มี default account หรือรหัสผ่านฝังในโค้ด
- Supabase SQL Editor: `UPDATE gm_members SET role='admin' WHERE email='YOUR_REGISTERED_EMAIL';`
- Reload/เข้าสู่ระบบใหม่เพื่อให้ FE อ่าน role ล่าสุด (Backend ตรวจ role จาก DB ทุกคำขอ)
- ตั้ง RAWG_API_KEY ใน Backend แล้ว restart; ไปหน้า Admin กด Sync RAWG
- ปุ่มนี้นำเข้า/อัปเดต 40 เกม popular หน้าแรก ไม่ใช่ทุกเกมและไม่เลื่อนไปหน้าถัดไปในรอบต่อไป ใช้ rawg_id ป้องกันซ้ำ transaction ทั้งรอบและคง description/is_published ที่ Admin แก้ไว้
- หาก RAWG ล่ม ข้อมูลเดิมยังอยู่; ปุ่ม Sync จะแจ้ง Error
- จัดเครดิต/ลิงก์ข้อมูลและรูปตามข้อกำหนดปัจจุบันของ RAWG ก่อนเผยแพร่จริง: https://rawg.io/apidocs

## 5. Deploy
ใช้ mono-repo นี้ได้ หรือแยก frontend/backend เป็น 2 repos ตามที่ทีมสะดวก

ผลจริงล่าสุดอยู่ใน `docs/DEPLOYMENT.md`: Frontend https://gamematch-projectweb-befe.vercel.app เรียก Backend https://gamematch-api-hzv6.onrender.com ซึ่งเชื่อม Supabase จริง ตั้ง CORS ให้ตรง origin แล้ว คลังหลักใช้ Steam จริงและซ่อน Demo เดิมไว้ RAWG เป็นทางเลือกเสริมที่ยังไม่มี key

Vercel:
- เชื่อม GitHub repo, Root Directory = frontend
- Install: `npm install --legacy-peer-deps`; Build: `npm run build`; Output: `build`
- ENV `REACT_APP_API_URL=https://YOUR-BACKEND.onrender.com` ไม่มี / ปิดท้าย
- เมื่อเปลี่ยน REACT_APP_* ต้อง build ใหม่ มี vercel.json รองรับ refresh nested routes

Render:
- Web Service เชื่อม GitHub repo, Root Directory = backend, Runtime Go
- Build: `go mod tidy && go build -o server .`; Start: `./server`
- ตั้ง `GO_VERSION=1.27.3`; dependency ที่แก้ช่องโหว่กำหนด Go ขั้นต่ำ 1.25 โดยคง net/http/JWT/bcrypt/pgxpool เดิม
- ENV: DATABASE_URL, JWT_SECRET, RAWG_API_KEY, ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app
- Health path: /healthz, ไม่ตั้ง localhost เป็น Production origin
- ไม่ต้อง hardcode PORT; Render ให้ค่าและ main.go อ่านให้อยู่แล้ว

## เอกสาร
- docs/API.md — endpoints และ JSON
- docs/HANDOFF.md — สถาปัตยกรรม จุดที่ต้องพัฒนาต่อ ข้อจำกัด
- docs/RUBRIC.md — เกณฑ์และหลักฐาน 20 คะแนน
- docs/VALIDATION.md — สิ่งที่ตรวจแล้ว/ยังไม่ได้ตรวจ
- CODEX_PROMPT_TH.md — พรอมต์รับช่วงงาน
- docs/DEMO.md — คู่มือเตรียมเดโมและบทพูด 14:30 นาทีสำหรับสมาชิก 2 คน
- docs/REFERENCES.md — โค้ดวิชาและข้อกำหนด RAWG ที่ตรวจอ่าน
- frontend/src/tests/ — React tests แยกตาม feature ภายใน src เพื่อให้ CRA ค้นพบตามปกติ
- frontend/tests/browser/ — QA headless แยกจาก dependencies ของเว็บ พร้อมคำสั่งรันซ้ำและขอบเขต API จำลอง
- backend/tests/ — Go tests เรียก public functions จากแพ็กเกจใช้งานจริง

Frontend ตรวจชื่อที่แสดงไม่เกิน 100 UTF-8 bytes, ชื่อเกมไม่เกิน 250 bytes และรหัสผ่านไม่เกิน 72 bytes ให้ตรงกับ Go; ภาษาไทยใช้หลายไบต์ต่อตัว ข้อมูลยังต้องผ่าน validation และ authorization ที่ Go เสมอ หากสมัครสำเร็จแต่ auto-login ล้มเหลว เว็บพาไปลองเข้าสู่ระบบแทนสมัครซ้ำ

เมื่อ protected API ตอบ 401 frontend ล้าง session และข้อมูลหน้าสมาชิกโดยไม่ต้อง reload; 403 ไม่ทำให้หลุดจากระบบ การ logout/เปลี่ยนบัญชีในอีกแท็บทำให้แท็บเดิมซ่อนข้อมูลเก่าและตรวจบัญชีกับ Go ใหม่ คำตอบ API เก่าต้องไม่ล้างหรือทับ session ที่ล็อกอินภายหลัง หากตรวจบัญชีเจอ server outage ชั่วคราวจะเก็บ token ไว้และให้ลองตรวจใหม่

## ข้อจำกัดที่ต้องเข้าใจ
- JWT ใน localStorage ตามแนวทางวิชา; ออกระบบและเปลี่ยนรหัสผ่านยกเลิกทุก Session ของบัญชีผ่าน token_version
- Scoring ใช้ Tags แบบเทียบตรง ข้อมูล tag ที่ไม่มีหมายถึงยังยืนยันไม่ได้ Generic multiplayer ไม่เท่ากับ co-op
- ไม่เดาราคา Free/Paid หรือเวลาเล่นต่อครั้ง และไม่ทำ Machine Learning
- Login/Register ใช้ limiter ร่วมกัน 30 คำขอต่อ TCP peer ต่อ 1 นาที ส่ง JSON 429 พร้อม Retry-After ไม่เชื่อ X-Forwarded-For จากผู้เรียก ข้อจำกัด: ทำงานต่อ process, restart รีเซ็ต และผู้ใช้หลัง proxy/NAT อาจแชร์ bucket ต้องวางแผนเพิ่มหากเปิดใช้งานวงกว้าง
- DB integration และ RAWG transaction rollback ทดสอบกับ Supabase จริงแล้ว แต่ข้อมูล upstream ในเทส RAWG เป็น fixture; ยังไม่มี key ของผู้ใช้สำหรับนำเข้าจริง การ deploy และเครดิตข้อมูลจริงยังต้องยืนยันก่อนส่ง
- อัปเดต React Router 6.30.6 และ AJV 8.20.0 แล้ว ผล `npm audit` ล่าสุดยังพบ 36 รายการ (16 low / 7 moderate / 13 high) รวม tooling ของ CRA และ Router advisory ที่ยังรายงานอยู่ ต้องตรวจตาม `docs/evidence/npm-audit.json` ก่อนเผยแพร่กว้าง ไม่ใช้ `npm audit fix --force` เพราะอาจเปลี่ยน stack ที่วิชากำหนด
