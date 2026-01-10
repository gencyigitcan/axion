# Antigravity – Kurumsal SaaS Master Architecture (2026) v2
**Document Status:** Enterprise Draft  
**Target Date:** 2026-01-10  
**Architect:** Antigravity (Principal Full-Stack Architect)

---

## 1. Supabase ER Diagram & Schema Logic

Bu sistemin kalbi **Multi-Tenancy** mimarisidir. Her veri satırı, hangi işletmeye (Tenant) ait olduğunu bilmek zorundadır. Veri izolasyonu application-layer değil, database-layer seviyesinde (RLS) garanti altına alınacaktır.

### 1.1 Temel Tablolar

**`tenants` (İşletmeler)**
- **Açıklama:** Sistemi kullanan spor salonları veya stüdyolar.
- **Alanlar:** `id` (UUID), `name`, `subdomain_slug`, `brand_config` (JSONB: logo, colors), `subscription_status`.
- **Neden?:** SaaS yapısının temeli. Tüm veriler bu ID ile izole edilir.

**`class_types` (Ders Tipleri)**
- **Açıklama:** Pilates, Yoga, PT, Yüzme gibi kategoriler.
- **İlişki:** Tenant (1-N).
- **Mantık:** Farklı işletmelerin "Pilates" tanımı farklı olabilir. Global değil, tenant-scoped olmalı.

**`user_profiles` (Kullanıcılar - Tenant Scoped)**
- **Açıklama:** İşletmeye kayıtlı üyeler, eğitmenler ve yöneticiler.
- **İlişki:** Tenant (1-N), StackAuth User ID (Link).
- **Alanlar:** `user_id` (Auth Service ID), `tenant_id`, `role` (enum: member, trainer, admin), `credits_balance` (Özet alan, performans için).
- **Not:** Bir kişi hem A salonunda Üye, hem B salonunda Eğitmen olabilir. Bu yüzden `users` tablosu tenant'a bağlıdır.

**`packages` (Paket Tanımları)**
- **Açıklama:** Satılan ürün şablonları (Örn: "10 Derslik Reformer Paketi").
- **Alanlar:** `validity_days`, `price`, `allowed_class_types` (Array of IDs veya Relation).

**`user_credits` (Aktif Haklar)**
- **Açıklama:** Kullanıcının satın aldığı ve kullanabileceği haklar defteri.
- **İlişki:** User (1-N), Package (1-N).
- **Alanlar:** `remaining_credits`, `expiration_date`, `is_active`.
- **Neden?:** Bir kullanıcının hem "PT Paketi" hem "Grup Dersi Paketi" aynı anda aktif olabilir. Tek bir "bakiye" alanı yetersizdir.

### 1.2 Operasyonel Tablolar

**`class_sessions` (Ders Oturumları)**
- **Açıklama:** Takvimde görünen gerçek dersler.
- **Alanlar:** `trainer_id`, `class_type_id`, `start_time`, `end_time`, `capacity`, `current_bookings_count`.
- **Check Constraint:** `end_time > start_time`.

**`reservations` (Rezervasyonlar)**
- **Açıklama:** Üye ile Ders arasındaki bağlantı.
- **Alanlar:** `user_id`, `session_id`, `status` (booked, checked_in, cancelled, no_show), `used_credit_id` (Hangi paketten düştü?).
- **Index:** `(session_id, user_id)` unique constraint (Aynı derse iki kere rezervasyon yapılamaz).

**`audit_logs` (Denetim Kayıtları)**
- **Açıklama:** Değişmez (Immutable) tarihçe.
- **Alanlar:** `actor_id`, `action` (create_reservation, cancel_class), `table_name`, `record_id`, `old_value` (JSONB), `new_value` (JSONB), `tenant_id`.
- **Özellik:** Sadece `INSERT` izni vardır, `UPDATE/DELETE` veritabanı seviyesinde engellenir.

---

## 2. Supabase Row Level Security (RLS) Politikaları

Güvenlik, "Frontend'de ne gösterdiğimiz" değil, "Veritabanının neye izin verdiği"dir. Enterprise mimaride frontend ele geçirilmiş (compromised) kabul edilir.

**Neden Backend RLS?**
- SQL Injection veya Client-side manipülasyon riskini sıfıra indirir.
- Bir yazılımcı frontend'de `where tenant_id = ...` filtresini unutsa bile, veritabanı başka müşterinin verisini *asla* döndürmez.

### RLS Stratejileri

**Global Kural:** Tüm tablolarda `tenant_id` zorunlu kontrol edilir.
`auth.jwt() -> metadata -> tenant_id` eşleşmesi esastır.

#### 2.1 Member (Üye) Politikası
- **`class_sessions`:** `SELECT` (Tüm aktif dersleri görebilir).
- **`reservations`:** 
  - `SELECT`: `auth.uid() == user_id`. (Sadece kendi rezervasyonunu gör).
  - `INSERT`: İzin YOK. (Rezervasyon işlemi güvenli RPC fonksiyonu üzerinden yapılmalı, doğrudan tabloya insert risklidir).
- **`audit_logs`:** Erişim YOK.

#### 2.2 Trainer (Eğitmen) Politikası
- **`class_sessions`:** `SELECT` where `trainer_id == auth.uid()`.
- **`reservations`:** `SELECT` where `session_id` IN (Eğitmenin kendi dersleri). (Dersine kim gelecek görmeli).
- **`user_profiles`:** Sadece kendi dersine kayıtlı üyelerin özet bilgisini `READ`.

#### 2.3 Admin (İşletmeci) Politikası
- **Scope:** `tenant_id == admin_tenant_id` olan TÜM kayıtlar.
- **Yetki:** `SELECT`, `INSERT`, `UPDATE`, `SOFT_DELETE`.
- **Kısıt:** `audit_logs` tablosunu silemez veya değiştiremez (Sadece `SELECT`).

---

## 3. Rezervasyon Transaction Pseudo-Flow (Atomik Mimarisi)

Bu akış, **Database Function (Postgres RPC)** içinde tek bir transaction bloğunda çalışmalıdır. Sıralı API çağrıları (Client -> Get Credits -> Client -> Check Capacity -> Client -> Book) **RACE CONDITION** yaratır (Son kalan 1 kontenjanı 2 kişi aynı anda alabilir).

**RPC Fonksiyonu: `book_class_session(session_id, user_id)`**

1.  **BEGIN TRANSACTION**
    *   *Transaction Isolation Level: Serializable (veya Row Locking)*
    
2.  **Validasyonlar (Hata fırlatır ve rollback yapar):**
    *   **Auth Check:** Kullanıcı bu tenant'a üye mi?
    *   **Locking:** `SELECT ... FROM class_sessions WHERE id = session_id FOR UPDATE`. (Satırı kilitle, başkası okumasın).
    *   **Capacity Check:** `current_bookings < capacity`? Değilse -> `Error("Dolu")`.
    *   **Time Check:** Ders geçmişte mi? Başlamasına 1 saatten az mı kaldı?
    *   **Conflict Check:** Kullanıcının aynı saatte başka rezervasyonu var mı? (`overdosed` engelleme).
    *   **Credit Check:** Kullanıcının `class_type`'a uygun ve expire olmamış kredisi var mı? `SELECT ... FROM user_credits ... FOR UPDATE`.
    
3.  **Yazma İşlemleri (Atomik):**
    *   **Insert Reservation:** `reservations` tablosuna kayıt at (`status: booked`).
    *   **Decrement Credit:** Seçilen kredi paketinden `remaining_credits` 1 azalt. Eğer 0 olursa `is_active = false`.
    *   **Increment Capacity:** `class_sessions` tablosunda `current_bookings` + 1.
    *   **Audit Log:** `audit_logs` tablosuna detaylı kayıt (Hangi paket kullanıldı, saat kaçta, kim yaptı).
    
4.  **COMMIT**
    *   Veritabanı kilidi kaldırır.
    
5.  **Post-Process (Function dışı - Asenkron):**
    *   Return `Success`.
    *   Frontend: Toast Message ("Rezervasyon Başarılı").
    *   Edge Function Trigger: Kullanıcıya e-posta/push bildirimi gönder (Kritik path dışında).

**Neden Atomik?**
Çünkü "Krediyi düş" komutu ile "Rezervasyonu oluştur" komutu arasında elektrik kesilirse veya hata oluşursa; ya kredisi giden ama dersi olmayan bir müşteri ya da bedava ders alan bir müşteri oluşur. Transaction bunu engeller.

---

## 4. Mimari Kararların Gerekçesi (Enterprise Why?)

### Neden Supabase?
1.  **Postgres Power:** Enterprise dünyasında NoSQL (Firebase, Mongo) transaction güvenliği ve complex ilişkisel sorgular (Reporting) için yetersiz kalır. Supabase tam donanımlı Postgres sunar.
2.  **Realtime:** Resepsiyondaki admin, biri mobil uygulamadan rezervasyon yapınca ekranında anlık (WebSocket) kapasite değişimini görmelidir. Supabase Realtime bunu bedava sunar.
3.  **Built-in Auth & RLS:** Güvenlik katmanını kod yazmadan veritabanı seviyesinde hallederiz (Zero-Trust Architecture).

### Neden Stack Auth?
1.  **B2B Complexity:** Enterprise müşteriler SSO (Okta, Google Workspace), MFA ve Team Management ister. Bunları sıfırdan yazmak aylar sürer.
2.  **Managed Security:** User session yönetimi, token refresh gibi kritik güvenlik açıklarını dışarıya (delegated auth) aktarmak riski minimize eder.

### Neden Antigravity & Vercel Edge?
1.  **Mobile-First Performance:** Antigravity ile oluşturulan optimize React kodu, Vercel Edge Network üzerinde barınarak kullanıcının konumu ne olursa olsun <100ms sürede yüklenir. Spor salonunda internet zayıf olabilir; PWA desteği ve offline-first yaklaşım kritik önem taşır.
2.  **Zero-Cost Scalability:** Sunucu kiralama maliyeti yoktur. Sadece kullanım (inovcation) başına ödeme yapılır (Serverless). Küçük bir stüdyo için maliyet neredeyse sıfır iken, büyük bir zincir için sistem otomatik olarak ölçeklenir.

**Özet:** Bu mimari, küçük bir stüdyonun "ucuz" ihtiyacını karşılarken, dev bir spor kompleksinin "güvenlik ve tutarlılık" ihtiyacını aynı kod tabanında çözer.
