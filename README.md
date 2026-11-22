# YOU ME Online Shop — Kuzatuv kameralari, matraslar va kreslolar

Sizning YOU ME mahsulotlar do‘koningiz uchun **UZ / RU** ikki tilli sayt, savatsiz tezkor buyurtma, haqiqiy admin panel, SQLite ma’lumotlar bazasi va Telegram botga buyurtma yuborish imkoniyati.

## 1. Kompyuterda ishga tushirish

Node.js **22.13 yoki yangi** versiyasi kerak. Hech qanday npm paketi o‘rnatilmaydi.

```bash
npm start
```

So‘ng http://localhost:3000 ni oching. Admin panel: **http://localhost:3000/admin**.

Faqat mahalliy sinovda demo login: `admin`, parol: `YouMeDemo!2026`. Ommaviy sayt uchun haqiqiy `ADMIN_PASSWORD` va `SESSION_SECRET` majburiy. Production rejimda ADMIN_PASSWORD va SESSION_SECRET berilmasa server ishga tushmaydi.

## 2. Ishlaydigan imkoniyatlar

- Barcha o‘lchamdagi ekranlarda responsiv premium ko‘k-oq dizayn
- O‘zbekcha va ruscha to‘liq interfeys, mahsulot/kategoriya nomi va tavsifi ham ikki tilda
- Katalog, qidirish, kategoriya bo‘yicha filtr, narx bo‘yicha saralash, mahsulot tafsilotlari
- **Savat yo‘q** — «Buyurtma berish» tugmasi → ism, telefon, manzil, soni, izoh → yuborish
- Buyurtma serverda saqlanadi, admin buyurtmalar ro‘yxatida ko‘radi, holatini yangilaydi
- Admin login, kategoriyalarni yaratish/tahrirlash/o‘chirish, mahsulotlarni yaratish/tahrirlash/o‘chirish
- Mahsulot rasmlarini kompyuterdan yuklash (3MB dan kichik JPEG/PNG/WEBP; rasm baza ichida saqlanadi), yoki HTTPS URL
- Telegram bot tokeni va chat ID berilsa, har yangi buyurtma Telegramga avtomatik yuboriladi
- Siz yuborgan rasmlarga asoslanib fonidan ajratilgan katalog tasvirlari bilan **9 mahsulot va 4 kategoriya**, mahsulotlarning har biri yangi tayyorlangan shaffof fonli studiya rasmlarida. Barcha boshlang‘ich narxlar **0**, ya’ni **«Narxini so‘rang»**; ularni faqat admin paneldan to‘ldirasiz. Mahsulot qoldiqlari sinov uchun 10 qilib belgilangan, admin panelda haqiqiy qoldiqqa yangilang

## 3. Telegram bot ulash

1. Telegramda `@BotFather` orqali yangi bot yarating va token oling.
2. Botga xabar yuboring (yoki uni kanal/guruhga to‘g‘ri ruxsatlar bilan qo‘shing).
3. O‘zingizning chat ID raqamingizni aniqlang.
4. Server ENV sozlamalarida quyidagilarni kiriting:

```env
TELEGRAM_BOT_TOKEN=123456:your_secret_bot_token
TELEGRAM_CHAT_ID=123456789
```

Tokenni **hech qachon app.js yoki HTML ichiga yozmang**. Hamma Telegram so‘rovlari serverdan yuboriladi. Bot ulanmagan bo‘lsa ham buyurtmalar server bazasida saqlanadi va admin panelda chiqadi.

## 4. Render'ga joylash

`render.yaml` mavjud. Repozitoriyingizga yuklab, Render → New Blueprint orqali ulang. `ADMIN_PASSWORD`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` ni Render Environment bo‘limida kiriting.

**Muhim:** ma’lumotlar bazasi SQLite faylida saqlanadi. Render'ning bepul hostingida lokal disk vaqtinchalik bo‘lib, qayta deploy/restartda mahsulotlar, rasmlar va buyurtmalar yo‘qolishi mumkin. Berilgan `render.yaml` **Starter (pullik) instance va persistent disk** bilan tuzilgan. Bepul Render uchun ma’lumotlarni saqlaydigan alohida PostgreSQL backend kerak bo‘ladi — shunchaki bepul diskda SQLite'ni ishlatish ishlab chiqarish uchun tavsiya etilmaydi.

## 5. Xavfsizlik

- Admin auth: HTTP-only, same-site, HMAC-signed cookie; serverda session expiry.
- Admin o‘zgarishlari X-YouMe-CSRF tekshiruvidan o‘tadi. Begona Origin rad etiladi.
- Mahsulot/order ma’lumotlari serverda tekshiriladi, jami narx mijoz brauzeridan emas, bazadan hisoblanadi.
- Admin parolini productionda majburiy almashtirish, kuchli SESSION_SECRET, HTTPS ishlatish kerak.
- Browser orqali yuklangan JPG/PNG/WEBP rasmlarining signaturalari tekshiriladi, 3MB limit.
- Asosiy login/order rate limiting (xotirada); trafik ko‘p bo‘lsa tashqi rate limiter talab etiladi.

**Izoh:** Mahsulot rasmlari foydalanuvchi yuklagan haqiqiy suratlar; mahsulot nomlari tavsifiy, texnik parametrlar esa tasdiqlanmagan. Narxi kiritilmagan mahsulotlarda “Narxini so‘rang” yoziladi (baza qiymati 0). Buyurtma berish baribir mumkin, admin narxni kelishadi. Kamera va kreslo narxlarini, mahsulot qoldiqlarini admin panelda kiriting. To‘lov integratsiyasi hali yo‘q. Foydalanuvchining shaxsiy ma’lumotlarini amaldagi qonunchilikka rioya qilib saqlang va kerak bo‘lmaganda o‘chiring.

## Yangi kategoriyalar

- Kuzatuv kameralari / Камеры видеонаблюдения
- Quyosh panelli kameralar / Камеры с солнечной панелью
- Shishiriladigan matraslar / Надувные матрасы
- Shishiriladigan kreslolar / Надувные кресла

Foto katalogga kiritilgan. Har bir mahsulot **savatsiz to‘g‘ridan to‘g‘ri buyurtma** bilan ishlaydi.

## 6. Yangilangan katalog rasmlari va narxlar

Kameralar, och/to‘q ko‘k kreslolar va matras uchun **9 ta shaffof fonli WEBP** studiya tasviri saytning `public/assets/` papkasiga o‘rnatildi. Ular yuborgan suratlar asosida AI bilan tayyorlangan; sotilayotgan mahsulotning aniq modeli yoki konfiguratsiyasini savdodan oldin tekshiring.

**Mahsulot narxlari admin tomonidan kiritiladi:** `http://localhost:3000/admin` → **Mahsulotlar** → **Tahrirlash** → **Narx** → **Saqlash**. 0 qo‘yilgan bo‘lsa katalogda **«Narxini so‘rang / Цена по запросу»** aks etadi, mijoz baribir buyurtma yubora oladi. Admin kiritgan qiymat mijoz katalogida ham, Telegram buyurtma xabarida ham ishlatiladi.

Agar oldingi loyiha bazasi (`data/youme.sqlite`) ishlatilsa, **admin kiritgan narxlar va yuklagan rasmlar o‘zgartirilmaydi**; yangi shaffof rasmlar eski katalogning dastlabki asset fayllari o‘rnida ishlatiladi. Yangi loyiha uchun barcha 9 ta boshlang‘ich mahsulot narxi 0.

## 7. YOU ME aloqa va ijtimoiy tarmoqlar

Saytning bosh sahifadagi bog‘lanish qismida va pastki qismida quyidagi aloqa ma’lumotlari mavjud. Telefon raqamlaridagi havolalar qo‘ng‘iroq ilovasini ochadi, ijtimoiy tarmoq havolalari esa yangi oynada ochiladi. Interfeys UZ/RU tilida.

- Telefonlar: +998 90 018 33 44 va +998 90 034 33 44
- Telegram: https://t.me/youmeuz
- Instagram: https://www.instagram.com/youme_uz/
- YouTube: https://www.youtube.com/@youmeuz

Ijtimoiy havolalar foydalanuvchi yuborgan URLlardan alohida ajratildi, ortiqcha QR-parametr olib tashlandi.


## GitHub'ga yuklash

1. GitHub’da bo‘sh `YOU-ME-Online-Shop` repozitoriysi yarating. Tavsiya: avval **Private** qilib oching.
2. Shu papkadagi fayllarni repozitoriyning **asosiy katalogiga** yuklang. `YOU_ME_PRO/` nomli ichki papka yaratmang.
3. `.env` va `data/` fayllarini yuklamang (`.gitignore`da chiqarib tashlangan).
4. Render’da repozitoriyni ulang. `render.yaml` to‘lovli Starter + persistent disk talab qiladi.
5. Render Environment’da `ADMIN_PASSWORD`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`ni sozlang.
6. Admin panel `/admin` orqali mahsulotlar narxlarini va ombordagi qoldiqlarni kiriting.

**Eslatma:** GitHub’ga kodni joylash saytni avtomatik internetga chiqarish degani emas. Saytni ishga tushirish uchun Render kabi server kerak.


## Neon PostgreSQL (doimiy bepul baza)

Render Free servisdagi mahalliy SQLite ma'lumotlari qayta deployda yo'qolishi mumkin. Shuning uchun Neon Postgres ulanishi qo'shildi. Neon hisobidan connection URL oling va uni faqat Render Environment'da `DATABASE_URL` qiymati sifatida saqlang. Maxfiy URLni GitHub'ga kiritmang. `DATABASE_URL` bo'lsa server Postgres, bo'lmasa SQLite ishlatadi. `/api/health` endpointida `storage: postgres` bo'lishini tekshiring. Eski SQLite buyurtmalari avtomatik Neon'ga ko'chmaydi.

Eslatma: GitHub'ga fayllar `public/` va `public/assets/` joylashuviga mos ravishda yuklanishi kerak. Render'ning SQLite rejimi faqat sinov uchun.
