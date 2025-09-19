/**
 * ANGRY MEATBALLS - Sound Manager
 * Ses yönetimi ve efektleri
 */

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.isEnabled = localStorage.getItem('angryMeatballsSound') !== 'false';
        this.musicVolume = 0.3;
        this.effectVolume = 0.5;
        this.currentMusic = null;
        
        this.createSounds();
    }
    
    createSounds() {
        // Ses efektlerini oluştur (Web Audio API ile sentetik sesler)
        this.sounds = {
            launch: this.createTone(200, 0.3, 'triangle'),
            hit: this.createTone(150, 0.2, 'square'),
            destroy: this.createTone(100, 0.4, 'sawtooth'),
            enemyHit: this.createTone(300, 0.3, 'sine'),
            levelComplete: this.createMelody([440, 523, 659, 783], 0.5),
            gameOver: this.createMelody([440, 349, 293, 220], 0.8),
            bounce: this.createTone(400, 0.1, 'triangle'),
            whoosh: this.createNoiseSound(0.2)
        };
    }
    
    createTone(frequency, duration, waveType = 'sine') {
        return () => {
            if (!this.isEnabled) return;
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = waveType;
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.effectVolume, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Ses oynatılamadı:', error);
            }
        };
    }
    
    createMelody(frequencies, noteDuration) {
        return () => {
            if (!this.isEnabled) return;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    this.createTone(freq, noteDuration / 2, 'sine')();
                }, index * (noteDuration * 500));
            });
        };
    }
    
    createNoiseSound(duration) {
        return () => {
            if (!this.isEnabled) return;
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const bufferSize = audioContext.sampleRate * duration;
                const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                const output = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const whiteNoise = audioContext.createBufferSource();
                const gainNode = audioContext.createGain();
                
                whiteNoise.buffer = buffer;
                whiteNoise.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                gainNode.gain.setValueAtTime(this.effectVolume * 0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                
                whiteNoise.start(audioContext.currentTime);
                whiteNoise.stop(audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Ses oynatılamadı:', error);
            }
        };
    }
    
    // Arka plan müziği için basit melodi
    startBackgroundMusic() {
        if (!this.isEnabled) return;
        
        const playMelody = () => {
            const melody = [523, 587, 659, 523, 587, 659, 783, 659, 587, 523];
            melody.forEach((freq, index) => {
                setTimeout(() => {
                    this.createTone(freq, 0.4, 'sine')();
                }, index * 800);
            });
        };
        
        // İlk çalış
        playMelody();
        
        // Her 10 saniyede tekrarla
        this.currentMusic = setInterval(playMelody, 10000);
    }
    
    stopBackgroundMusic() {
        if (this.currentMusic) {
            clearInterval(this.currentMusic);
            this.currentMusic = null;
        }
    }
    
    // Ses efektlerini çal
    play(soundName) {
        if (this.sounds[soundName] && this.isEnabled) {
            this.sounds[soundName]();
        }
    }
    
    // Ses ayarları
    toggle() {
        console.log('SoundManager toggle çağrıldı, mevcut durum:', this.isEnabled); // Debug
        
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('angryMeatballsSound', this.isEnabled.toString());
        
        console.log('Yeni ses durumu:', this.isEnabled); // Debug
        
        if (!this.isEnabled) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        
        return this.isEnabled;
    }
    
    setVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Oyun olayları için özel sesler
    playLaunchSound() {
        this.play('whoosh');
        setTimeout(() => this.play('launch'), 100);
    }
    
    playHitSound(target) {
        if (target.type === 'Enemy') {
            this.play('enemyHit');
        } else {
            this.play('hit');
        }
        
        // Güçlü vuruş için ek efekt
        if (target.velocity && target.velocity.magnitude() > 5) {
            setTimeout(() => this.play('destroy'), 50);
        }
    }
    
    playDestroySound() {
        this.play('destroy');
        setTimeout(() => this.play('bounce'), 200);
    }
    
    playLevelCompleteSound() {
        this.play('levelComplete');
    }
    
    playGameOverSound() {
        this.play('gameOver');
    }
    
    playBounceSound() {
        this.play('bounce');
    }
}

// Global ses yöneticisi
export const soundManager = new SoundManager();
