# 🔢 Çarpım Kahramanı

Çocuklar için eğitici çarpım tablosu öğrenme oyunu.

## 🎮 Oyun Özellikleri

- **100 Soru Maksimum**: Oyun 100 soru ile sınırlı
- **3 Can Sistemi**: Yanlış cevaplarda can kaybı
- **Dinamik Zorluk**: 50 doğru sonrası 2 haneli sayılar
- **Ses Efektleri**: Timer beep, pop, hata, başarı sesleri
- **Skor Tablosu**: Supabase ile gerçek zamanlı skor kaydetme
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu

## 🎯 Oyun Modları

### Seviyeler
- **Yeni Öğreniyorum**: 15 saniye süre
- **Ben Biliyorum**: 5 saniye süre

### Tablolar
- **Karışık**: 2'lerden 10'lara kadar
- **Tek Tablo**: 2'ler, 3'ler, 4'ler... 10'lar

## 🏆 Skor Sistemi

- **Puan Hesaplama**: Her doğru cevap +1 puan
- **Seri Bonusu**: Her 3 seride +1 bonus puan
- **Skor Kaydetme**: Oyuncu adı ile skor kaydetme
- **Top 10 Listesi**: En yüksek skorlar

## 🔊 Ses Sistemi

- **Timer Beep**: Geri sayım sırasında
- **Pop Ses**: Cevap seçildiğinde
- **Hata Ses**: Yanlış cevap
- **Üzgün Melodi**: Canlar bittiğinde
- **Neşeli Melodi**: 100 soru tamamlandığında
- **Mute/Unmute**: Ses kontrol butonu

## 🗄️ Veritabanı

### Supabase Entegrasyonu
- **Gerçek Zamanlı**: Anlık skor güncelleme
- **Güvenli**: RLS (Row Level Security)
- **Detaylı**: Puan, süre, doğru sayısı, seri

### Veritabanı Yapısı
```sql
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

## 📊 Analytics

### Vercel Analytics Events
- `game_started`: Oyun başladığında
- `game_completed`: 100 soru tamamlandığında
- `correct_answer`: Doğru cevap verildiğinde
- `wrong_answer`: Yanlış cevap verildiğinde

## 🎨 Teknik Özellikler

- **Vanilla JavaScript**: Framework kullanmadan
- **Web Audio API**: Programatik ses üretimi
- **CSS Grid/Flexbox**: Modern layout
- **Responsive Design**: Mobil öncelikli
- **Accessibility**: ARIA labels, keyboard navigation

## 🚀 Kurulum

1. **Supabase Projesi Oluştur**
2. **Veritabanı Tablosu Kur**
3. **API Anahtarlarını Güncelle**
4. **Oyunu Test Et**

Detaylı kurulum için `SUPABASE_KURULUM.md` dosyasına bakın.

## 📱 Kullanım

1. **Seviye Seç**: Öğrenme veya Hızlı mod
2. **Tablo Seç**: Karışık veya tek tablo
3. **Oyna**: 1-4 tuşları veya mouse ile
4. **Skor Kaydet**: İsim gir ve kaydet
5. **Skor Tablosu**: Top 10'u görüntüle

## 🔧 Dosya Yapısı

```
carpim-tablosu/
├── index.html          # Ana oyun dosyası
├── supabase-config.js  # Veritabanı konfigürasyonu
├── SUPABASE_KURULUM.md # Kurulum rehberi
└── README.md          # Bu dosya
```

## 🎯 Hedef Kitle

- **Yaş**: 7-12 yaş arası çocuklar
- **Seviye**: İlkokul 2-4. sınıf
- **Amaç**: Çarpım tablosu öğrenme ve pekiştirme

## 🌟 Öne Çıkan Özellikler

- ✅ **Eğitici**: Matematik öğrenmeyi eğlenceli hale getirir
- ✅ **Motivasyonel**: Skor sistemi ile rekabet
- ✅ **Güvenli**: Çocuk dostu, reklamsız
- ✅ **Erişilebilir**: Klavye ve mouse desteği
- ✅ **Responsive**: Tüm cihazlarda çalışır
