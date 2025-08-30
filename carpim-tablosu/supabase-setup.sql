-- Supabase Çarpım Tablosu Oyunu Kurulum SQL'i

-- 1. Mevcut scores tablosunu sil (eğer varsa)
DROP TABLE IF EXISTS scores;

-- 2. Scores tablosunu oluştur
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

-- 3. RLS (Row Level Security) aktifleştir
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 4. Tüm kullanıcılar için okuma izni ver
CREATE POLICY "Enable read access for all users" ON scores
  FOR SELECT USING (true);

-- 5. Tüm kullanıcılar için yazma izni ver
CREATE POLICY "Enable insert access for all users" ON scores
  FOR INSERT WITH CHECK (true);

-- 6. Test verisi ekle (opsiyonel)
INSERT INTO scores (player_name, score, duration, correct_answers, best_streak, mode, table_type) VALUES
('Test Oyuncu', 85, 120000, 17, 5, 'learn', 'mix'),
('Demo Kullanıcı', 92, 98000, 18, 7, 'know', 'mix');

-- 7. Tabloyu kontrol et
SELECT * FROM scores ORDER BY score DESC LIMIT 10;
