# คู่มือติดตั้งและดูแลระบบ eXamplify (Private Cloud)

เอกสารนี้สำหรับผู้ติดตั้งและผู้ดูแลระบบ ใช้ติดตั้งบน VM เครื่องเดียวด้วย Docker Compose
ข้อมูลทั้งหมด (ผู้ใช้ รหัสผ่าน คอร์ส ผลสอบ) เก็บอยู่ในเครื่องขององค์กร ไม่มีการเชื่อมต่อ Google Firebase

---

## 1. ภาพรวมระบบ

```
ผู้ใช้ ──HTTPS:443──> proxy (Caddy) ──> app (Next.js :3000) ──> db (PostgreSQL 16)
                                                                   │
                                                 backup (pg_dump รายวัน → ./backups)
```

| Service | หน้าที่ | เปิดสู่ภายนอก |
|---|---|---|
| `proxy` | HTTPS, security headers, reverse proxy | พอร์ต 80, 443 |
| `app` | เว็บแอปและ API | ไม่เปิด (ผ่าน proxy เท่านั้น) |
| `db` | PostgreSQL | ไม่เปิด (อยู่ใน network ภายใน) |
| `backup` | สำรองฐานข้อมูลทุก 24 ชม. เก็บ 14 วัน | ไม่เปิด |
| `tools` | ใช้รันคำสั่งดูแลระบบครั้งคราว (สร้าง admin, ย้ายข้อมูล) | ไม่ได้รันตลอด |

## 2. ความต้องการของเครื่อง

| รายการ | ขั้นต่ำ (≤100 ผู้ใช้) | แนะนำ (100–300 ผู้ใช้) |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 / 24.04 LTS (หรือ Linux ที่รัน Docker ได้) | |
| Software | Docker Engine 24+ และ Docker Compose plugin v2 | |
| Network | พอร์ต 80 และ 443 เข้าถึงได้จากผู้ใช้; ออก internet ได้ตอน build | |
| DNS | ชื่อโดเมน เช่น `examplify.masci.or.th` ชี้มาที่ IP ของ VM | |

> **ต้องใช้ HTTPS** เพราะหน้าสอบใช้กล้อง (WebcamMonitor) ซึ่ง browser อนุญาตเฉพาะ HTTPS

## 3. ติดตั้ง Docker (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # logout/login ใหม่หนึ่งครั้ง
docker compose version            # ต้องได้ v2.x ขึ้นไป
```

## 4. ดึงโค้ดและตั้งค่า

```bash
git clone https://github.com/theerapanchankaew/eXamplify.git
cd eXamplify
cp .env.example .env
openssl rand -hex 24              # ใช้ผลลัพธ์เป็น POSTGRES_PASSWORD
nano .env
```

| ตัวแปร | ต้องตั้ง | ความหมาย |
|---|---|---|
| `APP_URL` | ✅ | URL ที่ผู้ใช้เปิด เช่น `https://examplify.masci.or.th` |
| `SITE_ADDRESS` | ✅ | ชื่อโดเมน (ไม่ใส่ https://) เช่น `examplify.masci.or.th` |
| `TLS_MODE` | ✅ | `auto` / `files` / `internal` (ดูข้อ 5) |
| `POSTGRES_PASSWORD` | ✅ | รหัสผ่านฐานข้อมูล ใช้ได้เฉพาะตัวอักษรและตัวเลข |
| `BOOTSTRAP_ADMIN_EMAILS` | แนะนำ | email ที่จะได้สิทธิ์ Admin ทันทีเมื่อสมัคร (คั่นด้วย `,`) |
| `ALLOW_SIGNUP` | | `false` = ปิดการสมัครเอง ให้ admin สร้างบัญชีให้เท่านั้น |
| `SESSION_TTL_DAYS` | | อายุการ login (ค่าเริ่มต้น 7 วัน) |
| `BACKUP_KEEP_DAYS` | | จำนวนวันที่เก็บไฟล์ backup (ค่าเริ่มต้น 14) |
| `FIREBASE_HASH_*` | เฉพาะตอนย้ายจาก Firebase | ดูข้อ 8 |

ค่าทั้งหมดอ่านตอนรัน **ไม่ต้อง build ใหม่** เมื่อแก้ `.env` แค่รัน `docker compose up -d`

## 5. HTTPS — เลือก 1 แบบ

| `TLS_MODE` | ใช้เมื่อ | ต้องเตรียม |
|---|---|---|
| `auto` | โดเมนจริง และพอร์ต 80/443 **เปิดจาก internet** | DNS ชี้มาที่ VM; Caddy ขอใบรับรอง Let's Encrypt และต่ออายุให้เอง |
| `files` | ใช้งานใน intranet และองค์กรมีใบรับรองเอง (เช่น wildcard `*.masci.or.th`) | วาง `deploy/certs/fullchain.pem` และ `deploy/certs/privkey.pem` |
| `internal` | ทดสอบ หรือ intranet ที่ยังไม่มีใบรับรอง | browser จะเตือน จนกว่าจะติดตั้ง root CA ของ Caddy ลงเครื่องผู้ใช้ (ดูข้อ 11) |

## 6. เริ่มระบบ

```bash
docker compose up -d --build      # ครั้งแรกใช้เวลาประมาณ 3–5 นาที
docker compose ps                 # app, db, proxy, backup ต้องเป็น running/healthy
curl -k https://<SITE_ADDRESS>/api/health    # ต้องได้ {"status":"ok"}
```

ตาราง database ถูกสร้างอัตโนมัติตอน app เริ่มทำงาน

## 7. สร้างผู้ดูแลระบบคนแรก

**วิธีที่ 1:** ตั้ง `BOOTSTRAP_ADMIN_EMAILS=admin@masci.or.th` ใน `.env` แล้วสมัครผ่านหน้าเว็บด้วย email นั้น

**วิธีที่ 2 (command line):**

```bash
docker compose run --rm -e ADMIN_PASSWORD='รหัสผ่านอย่างน้อย8ตัว' tools create-admin -- admin@masci.or.th
```

ถ้า email นี้มีบัญชีอยู่แล้ว คำสั่งจะเลื่อนบัญชีนั้นเป็น Admin
หลังจากนี้ Admin สร้างบัญชีให้ผู้อื่นและกำหนด role ได้ที่หน้า **Users**

## 8. ย้ายข้อมูลเดิมจาก Firebase (ทำครั้งเดียว ถ้ามีข้อมูลเดิม)

ข้อมูลทุก collection (รวม subcollection) และบัญชีผู้ใช้จะถูกคัดลอกมา โดยใช้ ID เดิมทั้งหมด
**ผู้ใช้เดิม login ด้วยรหัสผ่านเดิมได้** ไม่ต้องตั้งใหม่

1. **Service account key:** Firebase Console → Project settings → Service accounts → *Generate new private key*
   → บันทึกเป็น `secrets/service-account.json` (โฟลเดอร์นี้ถูก ignore ใน git แล้ว)
2. **Password hash parameters:** Firebase Console → Authentication → Users → ⋮ → *Password hash parameters*
   → คัดลอก 4 ค่าลงใน `.env`:
   ```
   FIREBASE_HASH_SIGNER_KEY=...
   FIREBASE_HASH_SALT_SEPARATOR=...
   FIREBASE_HASH_ROUNDS=8
   FIREBASE_HASH_MEM_COST=14
   ```
3. ทดลองก่อน (ไม่เขียนข้อมูล):
   ```bash
   docker compose run --rm tools migrate:firebase -- --credentials /secrets/service-account.json --dry-run
   ```
4. ย้ายจริง (รันซ้ำได้ ข้อมูลเดิมใน Postgres จะถูกเขียนทับด้วยข้อมูลจาก Firebase):
   ```bash
   docker compose run --rm tools migrate:firebase -- --credentials /secrets/service-account.json
   docker compose up -d              # ให้ app อ่านค่า FIREBASE_HASH_* ใหม่
   ```
5. ตรวจสอบ: login ด้วยบัญชีเดิม 2–3 บัญชี (Admin, Instructor, Student) แล้วดูคอร์ส ผลสอบ และ certificate
6. เมื่อยืนยันแล้ว: **ลบ** `secrets/service-account.json` และลบ key นั้นใน Firebase Console

หมายเหตุ:
- แนะนำให้หยุดใช้ระบบเดิมระหว่างย้าย (ข้อมูลที่เกิดหลังย้ายจะไม่ถูกคัดลอก) หรือรันขั้นที่ 4 ซ้ำก่อนสลับ DNS
- รหัสผ่านแบบ Firebase จะถูกแปลงเป็นรูปแบบใหม่โดยอัตโนมัติเมื่อผู้ใช้ login ครั้งแรก เมื่อผู้ใช้ทุกคน login แล้ว ลบค่า `FIREBASE_HASH_*` ได้

## 9. ข้อจำกัดที่ควรรู้ และสิ่งที่ควรปรับต่อ

สิทธิ์ทั้งหมดย้ายมาจาก `firestore.rules` เดิมแบบ 1:1 ([src/server/rules.ts](../src/server/rules.ts)) และมีการแก้ไขดังนี้:

| สถานะ | รายการ |
|---|---|
| ✅ แก้แล้ว | ผู้ใช้ตั้ง role ตัวเองเป็น Admin ได้ตอนสมัคร (ตอนนี้ server เป็นผู้กำหนด role) |
| ✅ แก้แล้ว | ผู้สอบอ่านเฉลย (`correctAnswer`) จาก network ได้ (ตอนนี้ server ลบเฉลยออกก่อนส่งให้ผู้ที่ไม่ใช่อาจารย์/admin) |
| ✅ แก้แล้ว | Admin สร้างผู้ใช้ใหม่แล้ว session ของตัวเองหลุด (ย้ายไปทำที่ `/api/admin/users`) |
| ✅ แก้แล้ว | Admin เปลี่ยน role ผู้อื่นไม่ได้ เพราะกฎเดิมเขียนผิด |
| ⚠️ ควรปรับ | ผู้ใช้ที่ login แล้ว **list** `users`, `enrollments`, `bookings`, `orders` ได้ทั้งหมด (เห็น email ของผู้อื่น) ตามกฎเดิม |
| ⚠️ ควรปรับ | ผู้ใช้ที่ login แล้วแก้ไข `examSchedules` ได้ (กฎเดิมเปิดไว้เพื่อให้นับจำนวนที่นั่งได้) |
| ℹ️ ข้อจำกัด | ยังไม่มีระบบส่ง email (ลืมรหัสผ่านต้องให้ admin รีเซ็ตให้ ดูข้อ 10) |
| ℹ️ ข้อจำกัด | ข้อมูล "realtime" ใช้การดึงข้อมูลใหม่ทุก 5 วินาที เหมาะกับผู้ใช้หลักร้อยคน |
| ℹ️ ข้อจำกัด | การจำกัดจำนวนครั้ง login ผิดเก็บในหน่วยความจำของ app (รองรับ app instance เดียว) |

## 10. งานดูแลประจำ

| งาน | คำสั่ง |
|---|---|
| ดูสถานะ | `docker compose ps` |
| ดู log | `docker compose logs -f app` (หรือ `proxy`, `db`, `backup`) |
| รีสตาร์ท | `docker compose restart app` |
| **อัปเดตเวอร์ชัน** | `git pull && docker compose up -d --build` (schema migrate อัตโนมัติ) |
| รีเซ็ตรหัสผ่านผู้ใช้ | `docker compose run --rm tools reset-password -- user@masci.or.th` (แสดงรหัสชั่วคราว) |
| เลื่อนเป็น Admin | `docker compose run --rm tools create-admin -- user@masci.or.th` |
| backup ทันที | `docker compose exec backup sh -c 'pg_dump --clean --if-exists \| gzip > /backups/manual-$(date +%F).sql.gz'` |

### Backup และการกู้คืน

- ไฟล์อยู่ที่ `./backups/examplify-YYYYmmdd-HHMMSS.sql.gz` (สร้างทุก 24 ชม. หลัง service เริ่ม)
- **ต้องคัดลอกออกนอกเครื่องอย่างสม่ำเสมอ** (NAS, object storage หรือระบบ backup ขององค์กร) เพราะถ้า VM เสีย backup ในเครื่องก็หายไปด้วย

กู้คืน:

```bash
docker compose stop app
gunzip -c backups/examplify-20261030-020000.sql.gz | \
  docker compose exec -T db psql -U examplify -d examplify -v ON_ERROR_STOP=1
docker compose start app
```

ควรทดสอบกู้คืนบนเครื่องทดสอบอย่างน้อยไตรมาสละครั้ง

## 11. แก้ปัญหาเบื้องต้น

| อาการ | สาเหตุที่พบบ่อย / วิธีแก้ |
|---|---|
| `docker compose up` แจ้ง `set POSTGRES_PASSWORD in .env` | ยังไม่ได้สร้าง/แก้ `.env` |
| เปิดเว็บไม่ได้ / ใบรับรองผิด (`auto`) | DNS ยังไม่ชี้มาที่ VM หรือพอร์ต 80/443 ถูก firewall กั้น — ดู `docker compose logs proxy` |
| browser เตือนใบรับรอง (`internal`) | ติดตั้ง root CA: `docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt .` แล้วนำไปติดตั้งในเครื่องผู้ใช้ (หรือเปลี่ยนเป็น `files`) |
| Login แล้วเด้งกลับหน้า login | `APP_URL` เป็น https แต่เปิดเว็บด้วย http หรือเปิดด้วยชื่อโดเมนที่ไม่ตรงกับ `SITE_ADDRESS` |
| API ตอบ `Cross-origin request rejected` | เปิดเว็บผ่านชื่ออื่นที่ไม่ใช่ `SITE_ADDRESS` หรือมี proxy อีกชั้นที่เปลี่ยน Host header |
| ผู้ใช้ที่ย้ายจาก Firebase login ไม่ได้ | ยังไม่ได้ตั้ง `FIREBASE_HASH_*` หรือยังไม่ได้รัน `docker compose up -d` หลังตั้งค่า |
| `app` ไม่ healthy | `docker compose logs app` — มักเป็นเพราะเชื่อมต่อ db ไม่ได้ |
| กล้องในหน้าสอบไม่ทำงาน | ต้องเปิดผ่าน HTTPS |

## 12. ความปลอดภัยของเครื่อง (checklist)

- [ ] Firewall เปิดเฉพาะ 22 (จำกัด IP ผู้ดูแล), 80, 443
- [ ] ไม่เปิดพอร์ต 5432 ออกภายนอก (compose ไม่ได้เปิดไว้อยู่แล้ว)
- [ ] `.env` และ `secrets/` สิทธิ์อ่านเฉพาะผู้ดูแล: `chmod 600 .env`
- [ ] คัดลอก `./backups` ออกนอกเครื่องอัตโนมัติ
- [ ] อัปเดต OS และ Docker เป็นประจำ
- [ ] หลังย้ายจาก Firebase เสร็จ ลบ service account key และ `legacy/firebase/`
