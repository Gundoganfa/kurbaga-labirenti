// Supabase konfigürasyonu
const SUPABASE_URL = 'https://tdbdohmeunhfldfqztdk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbCLsKr4OMkvTyErSE6j1A_cdYlF2Bn';

// Supabase client oluştur
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Rate limiting için basit sistem
const rateLimiter = {
    lastSave: 0,
    minInterval: 5000, // 5 saniye bekleme süresi
    
    canSave() {
        const now = Date.now();
        if (now - this.lastSave < this.minInterval) {
            return false;
        }
        this.lastSave = now;
        return true;
    }
};

// Skor tablosu işlemleri
const Scoreboard = {
    // Yeni skor ekle
    async addScore(playerName, score, duration, correctAnswers, bestStreak, mode, table) {
        try {
            // Rate limiting kontrolü
            if (!rateLimiter.canSave()) {
                console.error('Çok hızlı skor kaydetme denemesi');
                return null;
            }
            
            // Basit güvenlik kontrolleri
            if (!this.validateScore(score, duration, correctAnswers, bestStreak)) {
                console.error('Geçersiz skor verisi');
                return null;
            }
            
            const { data, error } = await supabase
                .from('scores')
                .insert([
                    {
                        player_name: playerName,
                        score: score,
                        duration: duration,
                        correct_answers: correctAnswers,
                        best_streak: bestStreak,
                        mode: mode,
                        table_type: table,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Skor eklenirken hata:', error);
            return null;
        }
    },

    // Skor doğrulama fonksiyonu
    validateScore(score, duration, correctAnswers, bestStreak) {
        // Temel kontroller
        if (score < 0 || score > 1000) return false; // Makul skor aralığı
        if (duration < 1000 || duration > 3600000) return false; // 1 saniye - 1 saat
        if (correctAnswers < 0 || correctAnswers > 100) return false; // 0-100 doğru
        if (bestStreak < 0 || bestStreak > 100) return false; // 0-100 seri
        
        // Mantık kontrolleri
        if (correctAnswers > score) return false; // Doğru sayısı skordan fazla olamaz
        if (bestStreak > correctAnswers) return false; // En iyi seri doğru sayısından fazla olamaz
        
        return true;
    },

    // En yüksek skorları getir (top 10)
    async getTopScores(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Skorlar getirilirken hata:', error);
            return [];
        }
    },

    // Oyuncunun en iyi skorunu getir
    async getPlayerBestScore(playerName) {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .eq('player_name', playerName)
                .order('score', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            return data[0] || null;
        } catch (error) {
            console.error('Oyuncu skoru getirilirken hata:', error);
            return null;
        }
    }
};

// Global olarak erişilebilir yap
window.Scoreboard = Scoreboard;
