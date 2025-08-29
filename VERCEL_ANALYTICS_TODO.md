# Vercel Analytics Kurulum Todo List

## 📋 Yapılacaklar Listesi

### ✅ 1. Paket Kurulumu
- [x] `npm install @vercel/analytics` komutunu çalıştır
- [x] package.json'da dependency'nin eklendiğini kontrol et

### ✅ 2. Ana Sayfa (index.html) Kurulumu
- [x] Head bölümüne Vercel Analytics script'ini ekle
- [x] Script'in doğru çalıştığını test et

### ✅ 3. Oyun Sayfalarına Analytics Ekleme
- [x] saat-ustasi.html - Head + Event tracking
- [x] kurbaga-labirenti.html - Head + Event tracking
- [x] uzay-macerasi.html - Head + Event tracking
- [x] mantik-bulmacalari.html - Head + Event tracking
- [x] hafiza-taslari.html - Head + Event tracking
- [x] carpim-tablosu.html - Head + Event tracking
- [x] blok-dunyasi.html - Head + Event tracking
- [x] flappy.html - Head + Event tracking
- [x] masa-tenisi.html - Head + Event tracking

### ✅ 4. Alt Klasör Oyunları
- [x] AddRunner/index.html - Head + Event tracking
- [x] MultiDefense/index.html - Head + Event tracking
- [x] Balonlar/index.html - Head + Event tracking (varsa)
- [x] Kebapci/index.html - Head + Event tracking (varsa)

### ✅ 5. Event Tracking Detayları
Her oyun için şu event'leri ekle:
- [x] `game_started` - Oyun başladığında (saat-ustasi.html'de eklendi)
- [x] `game_completed` - Oyun bittiğinde (saat-ustasi.html'de eklendi)
- [x] `correct_answer` - Doğru cevap verildiğinde (saat-ustasi.html'de eklendi)
- [x] `wrong_answer` - Yanlış cevap verildiğinde (saat-ustasi.html'de eklendi)
- [ ] `level_completed` - Seviye tamamlandığında (diğer oyunlara eklenebilir)

### ✅ 6. Vercel Dashboard Kurulumu
- [ ] Vercel'e deploy et
- [ ] Analytics sekmesini aktifleştir
- [ ] Web Analytics özelliğini aç

### ✅ 7. Test ve Doğrulama
- [ ] Tüm sayfaları ziyaret et
- [ ] Oyunları oyna
- [ ] Dashboard'da verileri kontrol et
- [ ] Event'lerin doğru gönderildiğini doğrula

### ✅ 8. Optimizasyon
- [ ] Gereksiz event'leri temizle
- [ ] Performance impact'i kontrol et
- [ ] Privacy compliance'ı doğrula

## 🎯 Öncelik Sırası
1. Ana sayfa (index.html) - En yüksek trafik
2. Popüler oyunlar (saat-ustasi, kurbaga-labirenti)
3. Diğer oyunlar
4. Test ve optimizasyon

## 📊 Beklenen Sonuçlar
- Sayfa görüntüleme sayıları
- Oyun popülerlik sıralaması
- Kullanıcı engagement metrikleri
- Performance insights
