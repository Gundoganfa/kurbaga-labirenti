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

// Online Presence sistemi (Real-time online kullanıcı sayısı)
const OnlinePresence = {
    channel: null,
    onlineCount: 0,
    userUuid: null,

    // Presence sistemini başlat
    async initialize() {
        try {
            if (!supabase) {
                console.error('Supabase client mevcut değil, presence başlatılamıyor');
                return false;
            }

            // Unique user ID oluştur
            this.userUuid = this.generateUserUuid();
            console.log('Presence User UUID:', this.userUuid);

            // Channel oluştur
            this.channel = supabase.channel('carpim-tablosu-game', {
                config: {
                    presence: {
                        key: this.userUuid
                    }
                }
            });

            // Presence eventlerini dinle
            this.channel
                .on('presence', { event: 'sync' }, () => {
                    this.handlePresenceSync();
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('Kullanıcı katıldı:', key, newPresences);
                    this.updateOnlineCount();
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('Kullanıcı ayrıldı:', key, leftPresences);
                    this.updateOnlineCount();
                });

            // Channel'a abone ol ve presence'ı track et
            await this.channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Presence channel\'a başarıyla abone olundu');
                    
                    // Kendimizi presence'a ekle
                    await this.channel.track({
                        user_uuid: this.userUuid,
                        joined_at: new Date().toISOString(),
                        game: 'carpim-tablosu',
                        user_agent: navigator.userAgent.substring(0, 100)
                    });
                    
                    console.log('Presence tracking başlatıldı');
                } else {
                    console.error('Presence channel abone olma başarısız:', status);
                }
            });

            // Sayfa kapatılırken presence'dan çık
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });

            // Sayfa gizlenirken/görünürken
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Sayfa gizli - presence'ı durdur
                    this.channel?.untrack();
                } else {
                    // Sayfa görünür - presence'ı yeniden başlat
                    this.channel?.track({
                        user_uuid: this.userUuid,
                        joined_at: new Date().toISOString(),
                        game: 'carpim-tablosu',
                        user_agent: navigator.userAgent.substring(0, 100)
                    });
                }
            });

            return true;
        } catch (error) {
            console.error('Presence başlatma hatası:', error);
            return false;
        }
    },

    // Presence sync eventini handle et
    handlePresenceSync() {
        console.log('Presence sync eventı alındı');
        this.updateOnlineCount();
    },

    // Online kullanıcı sayısını güncelle
    updateOnlineCount() {
        if (!this.channel) return;

        const presenceState = this.channel.presenceState();
        const count = Object.keys(presenceState).length;
        
        this.onlineCount = count;
        console.log('Online kullanıcı sayısı:', count);

        // UI'ı güncelle
        this.updateUI(count);
    },

    // UI'daki online badge'i güncelle
    updateUI(count) {
        const onlineBadge = document.getElementById('online-badge');
        if (onlineBadge) {
            if (count === 0) {
                // Hiç kullanıcı yok - muhtemelen bağlantı sorunu
                onlineBadge.textContent = '⚡ Bağlanıyor...';
                onlineBadge.title = 'Online kullanıcı sayısı yükleniyor';
            } else if (count === 1) {
                onlineBadge.textContent = '🟢 Online: 1';
                onlineBadge.title = 'Sadece sen çevrimiçisin';
            } else {
                onlineBadge.textContent = `🔥 Online: ${count}`;
                onlineBadge.title = `${count} kişi şu anda çarpım tablosu oyunu oynuyor`;
            }
        }
    },

    // Bağlantı durumunu kontrol et ve UI'ı güncelle
    setConnectionStatus(status, message = '') {
        const onlineBadge = document.getElementById('online-badge');
        if (onlineBadge) {
            switch(status) {
                case 'connecting':
                    onlineBadge.textContent = '⚡ Bağlanıyor...';
                    onlineBadge.title = 'Online sayacı bağlantısı kuruluyor';
                    break;
                case 'connected':
                    onlineBadge.textContent = '🟢 Online: 1';
                    onlineBadge.title = 'Bağlantı başarılı! Online kullanıcı sayısı aktif';
                    break;
                case 'failed':
                    onlineBadge.textContent = '⚡ Offline';
                    onlineBadge.title = 'Online sayacı şu an çalışmıyor (internet bağlantısı gerekli)';
                    break;
                case 'retry':
                    onlineBadge.textContent = '🔄 Yeniden...';
                    onlineBadge.title = 'Bağlantı yeniden deneniyor';
                    break;
            }
        }
    },

    // Unique user UUID oluştur
    generateUserUuid() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Temizlik (sayfa kapatılırken)
    async cleanup() {
        try {
            if (this.channel) {
                await this.channel.untrack();
                await this.channel.unsubscribe();
                console.log('Presence temizlendi');
            }
        } catch (error) {
            console.error('Presence temizleme hatası:', error);
        }
    },

    // Manuel olarak online sayısını al
    async getOnlineCount() {
        if (!this.channel) return 0;
        const presenceState = this.channel.presenceState();
        return Object.keys(presenceState).length;
    }
};

// Global olarak erişilebilir yap
window.Scoreboard = Scoreboard;
window.testSupabaseConnection = testSupabaseConnection;
window.OnlinePresence = OnlinePresence;
