# 🗄️ Supabase Skor Tablosu Kurulum Rehberi

## 📋 Gereksinimler
- Supabase hesabı (ücretsiz)
- Çarpım tablosu oyunu

## 🚀 Adım Adım Kurulum

### 1. Supabase Projesi Oluştur
1. [supabase.com](https://supabase.com) adresine git
2. "Start your project" butonuna tıkla
3. GitHub ile giriş yap
4. "New Project" butonuna tıkla
5. Proje adı: `gundoganfa@gmail.com's Project`
6. Database password oluştur (unutma!)
7. Region seç (en yakın)
8. "Create new project" butonuna tıkla

### 2. Veritabanı Tablosu Oluştur
1. Supabase Dashboard'da projene git
2. Sol menüden "Table Editor" seç
3. "New table" butonuna tıkla
4. Tablo adı: `scores`
5. Aşağıdaki sütunları ekle:

```sql
-- scores tablosu
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  best_streak INTEGER NOT NULL,
  mode TEXT NOT NULL,
  table_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**⚠️ Eğer mevcut tablo varsa ve silmek istiyorsan:**
```sql
-- Mevcut scores tablosunu sil
DROP TABLE IF EXISTS scores;
```

### 3. RLS (Row Level Security) Ayarla
1. "Authentication" > "Policies" bölümüne git
2. `scores` tablosunu seç
3. "New Policy" butonuna tıkla
4. "Create a policy from scratch" seç
5. Policy name: `Enable read access for all users`
6. Target roles: `public`
7. Using expression: `true`
8. "Review" ve "Save policy" butonlarına tıkla

### 4. API Anahtarlarını Al
1. "Settings" > "API" bölümüne git
2. "Project URL" kopyala
3. "anon public" anahtarını kopyala

### 5. Konfigürasyon Dosyasını Güncelle
1. `supabase-config.js` dosyasını aç
2. Aşağıdaki değerleri güncelle:

```javascript
const SUPABASE_URL = 'YOUR_PROJECT_URL'; // Project URL'ini buraya yapıştır
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // anon public anahtarını buraya yapıştır
```

### 6. Test Et
1. Oyunu çalıştır
2. 100 soru tamamla
3. Skor kaydetme modalı açılmalı
4. İsim gir ve kaydet
5. "Skor Tablosu" butonuna tıkla
6. Skorun listede görünmeli

## 🔧 Sorun Giderme

### Skor Kaydedilmiyor
- Supabase URL ve anahtar doğru mu?
- RLS policy ayarlandı mı?
- Console'da hata var mı?

### Skor Tablosu Yüklenmiyor
- İnternet bağlantısı var mı?
- Supabase projesi aktif mi?
- Console'da hata var mı?

## 📊 Veritabanı Yapısı

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | BIGSERIAL | Otomatik artan ID |
| player_name | TEXT | Oyuncu adı |
| score | INTEGER | Toplam puan |
| duration | INTEGER | Oyun süresi (ms) |
| correct_answers | INTEGER | Doğru cevap sayısı |
| best_streak | INTEGER | En iyi seri |
| mode | TEXT | Oyun modu (learn/know) |
| table_type | TEXT | Tablo türü (mix/2/3/.../10) |
| created_at | TIMESTAMP | Kayıt tarihi |

## 🎯 Özellikler

- ✅ Gerçek zamanlı skor tablosu
- ✅ Oyuncu adı ile skor kaydetme
- ✅ Top 10 skor listesi
- ✅ Detaylı oyun istatistikleri
- ✅ Responsive tasarım
- ✅ Modal popup'lar
- ✅ Klavye kısayolları

## 🔒 Güvenlik

- RLS (Row Level Security) aktif
- Sadece okuma izni (anon users)
- SQL injection koruması
- Input validation

## 📱 Mobil Uyumluluk

- Responsive modal tasarımı
- Touch-friendly butonlar
- Mobil optimizasyonu
- Cross-platform uyumluluk
