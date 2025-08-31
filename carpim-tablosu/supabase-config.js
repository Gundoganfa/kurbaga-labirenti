// Supabase konfigürasyonu
// NOT: Anon key frontend'de görünür olması normal (RLS ile korunur)
const SUPABASE_URL = 'https://tdbdohmeunhfldfqztdk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbCLsKr4OMkvTyErSE6j1A_cdYlF2Bn';

// Supabase client oluştur
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client başarıyla oluşturuldu');
} catch (error) {
    console.error('Supabase client oluşturulamadı:', error);
}

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
            console.log('Skor kaydetme başlatılıyor:', { playerName, score, duration, correctAnswers, bestStreak, mode, table });
            
            if (!supabase) {
                console.error('Supabase client mevcut değil');
                return null;
            }
            
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
            
            const scoreData = {
                player_name: playerName,
                score: score,
                duration: duration,
                correct_answers: correctAnswers,
                best_streak: bestStreak,
                mode: mode,
                table_type: table,
                created_at: new Date().toISOString()
            };
            
            console.log('Gönderilecek veri:', scoreData);
            
            const { data, error } = await supabase
                .from('scores')
                .insert([scoreData]);
            
            if (error) {
                console.error('Supabase hatası:', error);
                throw error;
            }
            
            console.log('Skor başarıyla kaydedildi:', data);
            // Supabase insert başarılıysa true döndür (data null olabilir)
            return true;
        } catch (error) {
            console.error('Skor eklenirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return null;
        }
    },

    // Skor doğrulama fonksiyonu
    validateScore(score, duration, correctAnswers, bestStreak) {
        // Temel kontroller
        if (score < 0 || score > 10000) return false; // Makul skor aralığı (0 -> 10000)
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
            console.log('Skor tablosu getiriliyor, limit:', limit);
            
            if (!supabase) {
                console.error('Supabase client mevcut değil');
                return [];
            }
            
            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('Supabase skor getirme hatası:', error);
                throw error;
            }
            
            console.log('Skor tablosu başarıyla getirildi:', data);
            return data;
        } catch (error) {
            console.error('Skorlar getirilirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
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

// Supabase bağlantı test fonksiyonu
const testSupabaseConnection = async () => {
    try {
        console.log('Supabase bağlantısı test ediliyor...');
        console.log('URL:', SUPABASE_URL);
        console.log('Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
        
        if (!supabase) {
            console.error('Supabase client henüz oluşturulmamış');
            return false;
        }
        
        // Basit bir sorgu ile bağlantıyı test et
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Supabase bağlantı hatası:', error);
            console.error('Hata detayları:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return false;
        }
        
        console.log('Supabase bağlantısı başarılı!');
        return true;
    } catch (error) {
        console.error('Supabase bağlantı testi başarısız:', error);
        return false;
    }
};

// Sayfa yüklendiğinde bağlantıyı test et
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testSupabaseConnection, 1000);
});

// Global olarak erişilebilir yap
window.Scoreboard = Scoreboard;
window.testSupabaseConnection = testSupabaseConnection;
