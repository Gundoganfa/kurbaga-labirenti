/**
 * ANGRY MEATBALLS - Main Game Engine
 * Ana oyun motoru ve koordinasyon
 */

import { CONFIG, GAME_STATES } from './config.js';
import { Vector2D, CollisionDetector } from './physics.js';
import { GameState, Meatball, Enemy, Block } from './gameObjects.js';
import { Slingshot } from './slingshot.js';
import { LevelManager } from './levelManager.js';
import { ParticleSystem } from './particles.js';
import { soundManager } from './soundManager.js';

// =====================================
// MAIN GAME CLASS
// =====================================

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new GameState();
        this.objects = [];
        this.slingshot = new Slingshot(CONFIG.SLINGSHOT_X, CONFIG.SLINGSHOT_Y);
        this.levelManager = new LevelManager(this);
        this.particleSystem = new ParticleSystem();
        this.mouse = new Vector2D(0, 0);
        this.isMouseDown = false;
        this.debugDrawn = false;
        
        // Make game globally accessible
        window.game = this;
        
        // Show loading screen first
        this.showLoadingScreen();
        
        // Initialize after a short delay for loading screen
        setTimeout(() => {
            this.init();
        }, 100);
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupUI();
        this.slingshot.init();
        this.loadLevel(1);
        
        // Ses sistemini başlat ve global erişim için window'a ata
        window.soundManager = soundManager;
        soundManager.startBackgroundMusic();
        
        // Ses butonunun başlangıç durumunu ayarla
        setTimeout(() => {
            this.updateSoundButtonState();
            this.testSoundButton();
        }, 100);
        
        this.gameLoop();
    }
    
    setupCanvas() {
        // Set canvas size based on container
        const container = this.canvas.parentElement;
        if (!container) {
            console.error('Canvas container not found!');
            return;
        }
        const containerRect = container.getBoundingClientRect();
        
        // Set responsive canvas size
        const canvasWidth = Math.min(CONFIG.CANVAS_WIDTH, containerRect.width - 20);
        const canvasHeight = Math.min(CONFIG.CANVAS_HEIGHT, window.innerHeight * 0.6);
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        // Update config values for responsive gameplay
        CONFIG.SLINGSHOT_Y = canvasHeight - 150;
        
        // Update slingshot position if it exists
        if (this.slingshot) {
            this.slingshot.position.y = CONFIG.SLINGSHOT_Y;
        }
        
        console.log(`Canvas initialized: ${canvasWidth}x${canvasHeight}`);
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Button events
        this.setupButtonEvents();
    }
    
    setupButtonEvents() {
        const buttons = {
            'resetBtn': () => this.resetLevel(),
            'pauseBtn': () => this.togglePause(),
            'soundBtn': () => this.toggleSound(),
            'nextLevelBtn': () => this.nextLevel(),
            'homeBtn': () => this.goHome(),
            'retryBtn': () => this.resetLevel(),
            'continueBtn': () => this.nextLevel(),
            'menuBtn': () => this.goHome()
        };
        
        Object.entries(buttons).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                console.log(`Event listener eklendi: ${id}`); // Debug
            } else {
                console.warn(`Element bulunamadı: ${id}`); // Debug
            }
        });
    }
    
    setupUI() {
        this.updateUI();
        
        // Hide loading screen after game is ready
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            console.log('Game UI ready, loading screen hidden');
        }, 1000);
    }
    
    // =====================================
    // INPUT HANDLING
    // =====================================
    
    handleMouseDown(e) {
        if (this.state.isGamePaused || this.state.isGameOver) return;
        this.updateMousePosition(e);
        this.isMouseDown = true;
        this.slingshot.startDrag(this.mouse);
    }
    
    handleMouseMove(e) {
        if (this.state.isGamePaused || this.state.isGameOver) return;
        this.updateMousePosition(e);
        if (this.isMouseDown) {
            this.slingshot.updateDrag(this.mouse);
        }
    }
    
    handleMouseUp(e) {
        if (this.state.isGamePaused || this.state.isGameOver) return;
        this.isMouseDown = false;
        this.slingshot.releaseDrag();
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp(e);
    }
    
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }
    
    // =====================================
    // GAME LOOP
    // =====================================
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.state.isGamePaused || this.state.isGameOver) return;
        
        // Update all objects
        this.updateObjects();
        
        // Update particle system
        this.particleSystem.update();
        
        // Check collisions
        this.checkCollisions();
        
        // Check level completion
        this.checkGameState();
        
        this.updateUI();
    }
    
    updateObjects() {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            obj.update();
            obj.checkBounds(this.canvas);
            
            if (obj.isDestroyed) {
                this.objects.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        const meatballs = this.objects.filter(obj => obj instanceof Meatball);
        const targets = this.objects.filter(obj => obj instanceof Enemy || obj instanceof Block);
        const blocks = this.objects.filter(obj => obj instanceof Block);
        
        meatballs.forEach(meatball => {
            // Check collision with targets
            targets.forEach(target => {
                if (CollisionDetector.circleRectCollision(meatball, target)) {
                    this.handleCollision(meatball, target);
                }
            });
            
            // Check ground collision for meatball
            this.checkGroundCollisionMeatball(meatball);
        });
        
        // Check block-block collisions
        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                if (CollisionDetector.rectRectCollision(blocks[i], blocks[j])) {
                    this.resolveBlockCollision(blocks[i], blocks[j]);
                }
            }
        }
        
        // Check ground collision for all objects
        targets.forEach(target => {
            this.checkGroundCollisionObject(target);
        });
        
        // Check block collisions for enemies (so they can stand on blocks)
        const enemies = this.objects.filter(obj => obj instanceof Enemy);
        enemies.forEach(enemy => {
            this.checkBlockCollisionForObject(enemy, blocks);
        });
        
        // Check block collisions for other blocks (stacking)
        blocks.forEach(block => {
            this.checkBlockCollisionForObject(block, blocks.filter(b => b !== block));
        });
    }
    
    handleCollision(meatball, target) {
        // Play hit sound
        soundManager.playHitSound(target);
        
        // Apply damage
        if (target.takeDamage) {
            const damage = 1;
            target.takeDamage(damage);
        }
        
        // Trigger meatball collision
        meatball.onCollision(target);
        
        // Apply knockback
        const knockback = meatball.velocity.copy().multiply(0.5);
        target.velocity.add(knockback);
        
        // Create impact effect
        this.particleSystem.createImpactEffect(
            target.position.x + target.width/2, 
            target.position.y + target.height/2
        );
    }
    
    checkGroundCollisionMeatball(meatball) {
        if (meatball.position.y > this.canvas.height - 50) {
            // Play bounce sound
            if (Math.abs(meatball.velocity.y) > 2) {
                soundManager.playBounceSound();
            }
            
            meatball.velocity.y *= -CONFIG.BOUNCE_DAMPING;
            meatball.position.y = this.canvas.height - 50;
            meatball.hasLanded = true;
            
            // Ground impact effect
            this.particleSystem.createImpactEffect(meatball.position.x, this.canvas.height - 50, '💨');
        }
    }
    
    checkGroundCollisionObject(obj) {
        const groundY = this.canvas.height - 50;
        
        if (obj.position.y + obj.height > groundY) {
            // Object is touching or below ground
            obj.position.y = groundY - obj.height;
            obj.velocity.y = 0;
            obj.onGround = true;
            
            // Add friction when on ground
            obj.velocity.x *= 0.9;
        } else if (obj.position.y + obj.height < groundY - 5) {
            // Object is clearly above ground
            obj.onGround = false;
        }
    }
    
    resolveBlockCollision(block1, block2) {
        // Calculate overlap
        const overlapX = Math.min(
            block1.position.x + block1.width - block2.position.x,
            block2.position.x + block2.width - block1.position.x
        );
        const overlapY = Math.min(
            block1.position.y + block1.height - block2.position.y,
            block2.position.y + block2.height - block1.position.y
        );
        
        // Resolve collision by moving blocks apart
        if (overlapX < overlapY) {
            // Horizontal separation
            const moveX = overlapX / 2;
            if (block1.position.x < block2.position.x) {
                block1.position.x -= moveX;
                block2.position.x += moveX;
            } else {
                block1.position.x += moveX;
                block2.position.x -= moveX;
            }
            // Dampen horizontal velocity
            block1.velocity.x *= 0.5;
            block2.velocity.x *= 0.5;
        } else {
            // Vertical separation
            const moveY = overlapY / 2;
            if (block1.position.y < block2.position.y) {
                block1.position.y -= moveY;
                block2.position.y += moveY;
                block2.velocity.y = 0;
                block2.onGround = true;
            } else {
                block1.position.y += moveY;
                block2.position.y -= moveY;
                block1.velocity.y = 0;
                block1.onGround = true;
            }
        }
    }
    
    checkBlockCollisionForObject(obj, blocks) {
        let supported = false;
        
        blocks.forEach(block => {
            // Check if object is on top of this block
            if (obj.position.x + obj.width > block.position.x &&
                obj.position.x < block.position.x + block.width &&
                obj.position.y + obj.height > block.position.y &&
                obj.position.y + obj.height < block.position.y + block.height + 10) {
                
                // Object is on top of block
                obj.position.y = block.position.y - obj.height;
                obj.velocity.y = 0;
                obj.onGround = true;
                supported = true;
                
                // Add friction when on block
                obj.velocity.x *= 0.95;
            }
        });
        
        if (!supported) {
            obj.onGround = false;
        }
    }
    
    checkGameState() {
        // Check level completion (only once)
        if (!this.state.levelComplete && !this.state.isGameOver && this.levelManager.checkLevelComplete()) {
            this.completeLevel();
        }
        
        // Check game over
        if (!this.state.levelComplete && this.state.meatballsLeft <= 0 && !this.hasActiveMeatballs()) {
            if (!this.levelManager.checkLevelComplete()) {
                this.gameOver();
            }
        }
    }
    
    hasActiveMeatballs() {
        return this.objects.some(obj => obj instanceof Meatball);
    }
    
    // =====================================
    // RENDERING
    // =====================================
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw ground
        this.drawGround();
        
        // Draw slingshot
        this.slingshot.draw(this.ctx);
        
        // Draw all objects
        this.objects.forEach(obj => obj.draw(this.ctx));
        
        // Draw particles
        this.particleSystem.draw(this.ctx);
        
        // Debug info (first frame only)
        if (!this.debugDrawn) {
            console.log(`Drawing frame: Canvas size ${this.canvas.width}x${this.canvas.height}, Objects: ${this.objects.length}`);
            this.debugDrawn = true;
        }
        
        // Draw UI overlays
        if (this.state.isGamePaused) {
            this.drawPauseOverlay();
        }
    }
    
    drawBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#98D8E8');
        gradient.addColorStop(1, '#B0E0E6');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Clouds
        this.drawClouds();
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        const clouds = [
            { x: 200, y: 100, size: 60 },
            { x: 500, y: 80, size: 80 },
            { x: 800, y: 120, size: 50 },
            { x: 1000, y: 90, size: 70 }
        ];
        
        clouds.forEach(cloud => this.drawCloud(cloud.x, cloud.y, cloud.size));
    }
    
    drawCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.3, y, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x - size * 0.3, y, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawGround() {
        // Ground
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        
        // Ground details
        this.ctx.fillStyle = '#32CD32';
        for (let x = 0; x < this.canvas.width; x += 30) {
            this.ctx.fillRect(x, this.canvas.height - 45, 15, 5);
        }
    }
    
    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OYUN DURAKLATILDI', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    // =====================================
    // GAME STATE METHODS
    // =====================================
    
    loadLevel(levelNumber) {
        this.state.currentLevel = levelNumber;
        this.state.reset();
        this.state.isGamePaused = false; // Resume game when loading new level
        this.particleSystem.clear();
        
        const success = this.levelManager.loadLevel(levelNumber);
        if (!success) {
            this.gameComplete();
            return;
        }
        
        this.updateUI();
        this.hideModal();
    }
    
    resetLevel() {
        this.loadLevel(this.state.currentLevel);
    }
    
    nextLevel() {
        this.loadLevel(this.state.currentLevel + 1);
    }
    
    completeLevel() {
        this.state.levelComplete = true;
        this.state.isGamePaused = true; // Pause game to prevent multiple calls
        const stars = this.levelManager.calculateStars(this.state.meatballsUsed);
        
        // Play level complete sound
        soundManager.playLevelCompleteSound();
        
        // Create celebration effect
        this.particleSystem.createScoreEffect(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            1000
        );
        
        this.showModal('Seviye Tamamlandı!', stars, false);
    }
    
    gameOver() {
        this.state.isGameOver = true;
        
        // Play game over sound
        soundManager.playGameOverSound();
        
        this.showModal('Oyun Bitti!', 0, true);
    }
    
    gameComplete() {
        this.showModal('Tebrikler! Tüm seviyeleri tamamladın!', 3, false);
    }
    
    togglePause() {
        this.state.isGamePaused = !this.state.isGamePaused;
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = this.state.isGamePaused ? '▶️ Devam Et' : '⏸️ Duraklat';
        }
        
        // Müziği duraklat/devam ettir
        if (this.state.isGamePaused) {
            soundManager.stopBackgroundMusic();
        } else {
            soundManager.startBackgroundMusic();
        }
    }
    
    toggleSound() {
        console.log('toggleSound çağrıldı'); // Debug log
        
        try {
            const isEnabled = soundManager.toggle();
            console.log('Ses durumu:', isEnabled); // Debug log
            
            const soundBtn = document.getElementById('soundBtn');
            if (soundBtn) {
                soundBtn.textContent = isEnabled ? '🔊 Ses' : '🔇 Ses';
                console.log('Buton güncellendi:', soundBtn.textContent); // Debug log
            } else {
                console.error('Ses butonu bulunamadı!');
            }
        } catch (error) {
            console.error('toggleSound hatası:', error);
        }
    }
    
    updateSoundButtonState() {
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn && soundManager) {
            soundBtn.textContent = soundManager.isEnabled ? '🔊 Ses' : '🔇 Ses';
            console.log('Başlangıç ses durumu:', soundManager.isEnabled, 'Buton:', soundBtn.textContent);
        }
    }
    
    testSoundButton() {
        const soundBtn = document.getElementById('soundBtn');
        console.log('Sound button test:');
        console.log('- Buton mevcut:', !!soundBtn);
        console.log('- SoundManager mevcut:', !!soundManager);
        console.log('- window.soundManager mevcut:', !!window.soundManager);
        
        if (soundBtn) {
            console.log('- Buton text:', soundBtn.textContent);
            console.log('- Event listeners:', soundBtn.onclick ? 'var' : 'yok');
            
            // Test click handler
            soundBtn.addEventListener('click', function() {
                console.log('SOUND BUTTON CLICKED - Direct event');
            });
        }
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const progress = document.getElementById('loadingProgress');
        
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            
            // Simulate loading progress with realistic steps
            const loadingSteps = [
                { text: "Köfteler hazırlanıyor...", progress: 20 },
                { text: "Sebzeler yerleştiriliyor...", progress: 40 },
                { text: "Sapan ayarlanıyor...", progress: 60 },
                { text: "Fizik motoru başlatılıyor...", progress: 80 },
                { text: "Son dokunuşlar...", progress: 95 },
                { text: "Hazır!", progress: 100 }
            ];
            
            let currentStep = 0;
            const stepInterval = setInterval(() => {
                const step = loadingSteps[currentStep];
                const subtitle = document.querySelector('.loading-subtitle');
                
                if (subtitle) {
                    subtitle.textContent = step.text;
                }
                
                if (progress) {
                    progress.style.width = step.progress + '%';
                }
                
                currentStep++;
                
                if (currentStep >= loadingSteps.length) {
                    clearInterval(stepInterval);
                    setTimeout(() => {
                        loadingScreen.classList.add('hidden');
                    }, 800);
                }
            }, 400);
        }
    }

    goHome() {
        window.location.href = '../index.html';
    }
    
    // =====================================
    // UI METHODS
    // =====================================
    
    updateUI() {
        const elements = {
            'score': this.state.score,
            'meatballs-left': this.state.meatballsLeft,
            'level': this.state.currentLevel
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    showModal(title, stars, isGameOver) {
        const modal = document.getElementById('gameModal');
        if (!modal) return;
        
        // Update modal content
        const titleElement = document.getElementById('modalTitle');
        const scoreElement = document.getElementById('finalScore');
        const usedElement = document.getElementById('meatballsUsed');
        
        if (titleElement) titleElement.textContent = title;
        if (scoreElement) scoreElement.textContent = this.state.score;
        if (usedElement) usedElement.textContent = this.state.meatballsUsed;
        
        // Update stars
        const starsElement = document.getElementById('starsEarned');
        if (starsElement) {
            const starElements = starsElement.querySelectorAll('.star');
            starElements.forEach((star, index) => {
                star.style.opacity = index < stars ? '1' : '0.3';
            });
        }
        
        // Show/hide buttons
        const retryBtn = document.getElementById('retryBtn');
        const continueBtn = document.getElementById('continueBtn');
        
        if (retryBtn) retryBtn.style.display = isGameOver ? 'inline-block' : 'none';
        if (continueBtn) continueBtn.style.display = isGameOver ? 'none' : 'inline-block';
        
        modal.classList.remove('hidden');
    }
    
    hideModal() {
        const modal = document.getElementById('gameModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // =====================================
    // SPECIAL EFFECTS
    // =====================================
    
    createParticles(x, y, text = '💥', count = 5) {
        this.particleSystem.createImpactEffect(x, y, text, count);
    }
    
    createExplosion(x, y, radius) {
        // Visual explosion
        this.particleSystem.createExplosion(x, y, 10, radius);
        
        // Damage nearby objects
        this.objects.forEach(obj => {
            if ((obj instanceof Enemy || obj instanceof Block) && !obj.isDestroyed) {
                const distance = Math.sqrt((obj.position.x - x) ** 2 + (obj.position.y - y) ** 2);
                if (distance < radius) {
                    if (obj.takeDamage) {
                        obj.takeDamage(2);
                    }
                    // Knockback
                    const knockback = new Vector2D(obj.position.x - x, obj.position.y - y);
                    knockback.normalize().multiply(10);
                    obj.velocity.add(knockback);
                }
            }
        });
    }
    
    freezeNearbyObjects(position, radius) {
        this.objects.forEach(obj => {
            const distance = Math.sqrt((obj.position.x - position.x) ** 2 + (obj.position.y - position.y) ** 2);
            if (distance < radius) {
                obj.velocity.multiply(0.3); // Slow down
                
                // Visual freeze effect
                this.particleSystem.createImpactEffect(obj.position.x, obj.position.y, '❄️', 3);
            }
        });
    }
}

// =====================================
// INITIALIZE GAME
// =====================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Additional safety check for canvas element
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    console.log('Starting Angry Meatballs game...');
    new Game();
});
