# 🌊 Ocean Master Online — วิธีติดตั้งและรันเกม

## โครงสร้างไฟล์ในโปรเจกต์
- `package.json` — ข้อมูลแพ็กเกจ (`express`, `socket.io`)
- `server.js` — โค้ดเซิร์ฟเวอร์ออนไลน์ (ซิงค์ผู้เล่น, แชท, เวลา, สภาพอากาศ, บอส, กระดานอันดับ)
- `public/index.html` — ตัวเกมทั้งหมด (6 โซน, ปลา 26 สายพันธุ์ 6 ระดับ, สุ่มขนาด 5 ระดับ, มินิเกมเย่อเบ็ด, เหยื่อ 7 ชนิด, สมุดปลา, ปุ่มควบคุมบน iOS/มือถือ)

## 1. วิธีรันบนคอมพิวเตอร์ (Windows / Mac / Linux)
1. แตกไฟล์ `ocean-master-online.zip`
2. เปิด Terminal / CMD เข้าไปในโฟลเดอร์ `ocean-master-online`
3. พิมพ์คำสั่งติดตั้งแพ็กเกจ:
   ```bash
   npm install
   ```
4. รันเซิร์ฟเวอร์:
   ```bash
   npm start
   ```
5. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## 2. วิธีรันเซิร์ฟเวอร์บน iOS (iPhone / iPad)
1. โหลดแอป **a-Shell** (ฟรีบน App Store)
2. แตกไฟล์ ZIP ไว้ในแอป **Files (ไฟล์)** ของเครื่อง
3. เปิดแอป a-Shell พิมพ์ `pickFolder` แล้วเลือกโฟลเดอร์ `ocean-master-online`
4. พิมพ์คำสั่ง:
   ```bash
   npm install
   node server.js
   ```
5. เปิด Safari เข้า `http://localhost:3000` เพื่อเล่นได้ทันที (รองรับปุ่มสัมผัส D-Pad บนหน้าจอแล้ว)
