/**
 * ANGRY MEATBALLS - Game Objects
 * Oyun nesneleri ve sınıfları
 */

import { Vector2D, darkenColor } from './physics.js';
import { CONFIG } from './config.js';

// =====================================
// GAME STATE MANAGEMENT
// =====================================

export class GameState {
    constructor() {
        this.currentLevel = 1;
        this.score = 0;
        this.meatballsLeft = 5;
        this.isGamePaused = false;
        this.isGameOver = false;
        this.levelComplete = false;
        this.meatballsUsed = 0;
    }
    
    reset() {
        this.meatballsLeft = 5;
        this.meatballsUsed = 0;
        this.isGameOver = false;
        this.levelComplete = false;
    }
    
    nextLevel() {
        this.currentLevel++;
        this.reset();
    }
    
    useMeatball() {
        this.meatballsLeft--;
        this.meatballsUsed++;
    }
    
    addScore(points) {
        this.score += points;
    }
}

// =====================================
// BASE GAME OBJECT
// =====================================

export class GameObject {
    constructor(x, y, width, height) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.width = width;
        this.height = height;
        this.rotation = 0;
        this.isDestroyed = false;
    }
    
    update() {
        // Basic physics update
        this.position.add(this.velocity);
        // Note: Air resistance applied separately in specific objects like Meatball
    }
    
    checkBounds(canvas) {
        // Remove objects that go off screen
        if (this.position.x < -100 || 
            this.position.x > canvas.width + 100 || 
            this.position.y > canvas.height + 100) {
            this.isDestroyed = true;
        }
    }
    
    collidesWith(other) {
        return (this.position.x < other.position.x + other.width &&
                this.position.x + this.width > other.position.x &&
                this.position.y < other.position.y + other.height &&
                this.position.y + this.height > other.position.y);
    }
}

// =====================================
// MEATBALL CLASS
// =====================================

export class Meatball extends GameObject {
    constructor(x, y, type = 'NORMAL') {
        super(x, y, CONFIG.MEATBALL_RADIUS * 2, CONFIG.MEATBALL_RADIUS * 2);
        this.type = type;
        this.radius = CONFIG.MEATBALL_RADIUS;
        this.mass = CONFIG.MEATBALL_MASS;
        this.hasLanded = false;
        this.trail = [];
        this.maxTrailLength = 15;
    }
    
    update() {
        // Add position to trail
        this.trail.push(this.position.copy());
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Apply gravity
        this.velocity.y += CONFIG.GRAVITY;
        
        // Apply air resistance
        this.velocity.multiply(CONFIG.AIR_RESISTANCE);
        
        // Update position
        super.update();
        
        // Check if landed
        if (this.velocity.magnitude() < 0.5 && this.hasLanded) {
            this.isDestroyed = true;
        }
        
        // Update rotation based on velocity
        this.rotation += this.velocity.magnitude() * 0.1;
    }
    
    draw(ctx) {
        // Draw trail - each segment separately for proper alpha
        ctx.lineWidth = 3;
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgba(139, 69, 19, 1)';
            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Draw meatball
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Meatball body
        const meatballType = CONFIG.MEATBALL_TYPES[this.type];
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, meatballType.color);
        gradient.addColorStop(0.7, darkenColor(meatballType.color, 0.3));
        gradient.addColorStop(1, darkenColor(meatballType.color, 0.6));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Angry face
        ctx.fillStyle = 'white';
        // Eyes
        ctx.beginPath();
        ctx.arc(-8, -5, 3, 0, Math.PI * 2);
        ctx.arc(8, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-8, -5, 1.5, 0, Math.PI * 2);
        ctx.arc(8, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Angry eyebrows
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(-4, -6);
        ctx.moveTo(4, -6);
        ctx.lineTo(12, -8);
        ctx.stroke();
        
        // Angry mouth
        ctx.beginPath();
        ctx.arc(0, 8, 6, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
    
    onCollision(target) {
        this.hasLanded = true;
        
        // Apply special abilities
        const meatballType = CONFIG.MEATBALL_TYPES[this.type];
        if (meatballType.special) {
            this.activateSpecial(target);
        }
    }
    
    activateSpecial(target) {
        const special = CONFIG.MEATBALL_TYPES[this.type].special;
        
        switch (special) {
            case 'explode':
                // Create explosion effect - handled by game
                if (window.game) {
                    window.game.createExplosion(this.position.x, this.position.y, 80);
                }
                break;
            case 'speed':
                // Already handled by power multiplier
                break;
            case 'freeze':
                // Slow down nearby objects - handled by game
                if (window.game) {
                    window.game.freezeNearbyObjects(this.position, 100);
                }
                break;
        }
    }
}

// =====================================
// ENEMY CLASS
// =====================================

export class Enemy extends GameObject {
    constructor(x, y, type) {
        super(x, y, 40, 40);
        this.type = type;
        this.health = CONFIG.ENEMY_TYPES[type].health;
        this.maxHealth = this.health;
        this.points = CONFIG.ENEMY_TYPES[type].points;
        this.emoji = CONFIG.ENEMY_TYPES[type].emoji;
        this.hitAnimation = 0;
        this.onGround = false;
    }
    
    update() {
        // Apply gravity if not on ground
        if (!this.onGround) {
            this.velocity.y += CONFIG.GRAVITY;
        }
        
        super.update();
        
        // Reduce hit animation
        if (this.hitAnimation > 0) {
            this.hitAnimation--;
        }
        
        // Check if destroyed
        if (this.health <= 0) {
            this.isDestroyed = true;
            if (window.game && window.game.state) {
                window.game.state.addScore(this.points);
                window.game.createParticles(this.position.x, this.position.y, this.emoji);
                
                // Play destroy sound
                if (window.soundManager) {
                    window.soundManager.playDestroySound();
                }
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x + this.width/2, this.position.y + this.height/2);
        
        // Hit flash effect
        if (this.hitAnimation > 0) {
            ctx.filter = 'brightness(200%)';
        }
        
        // Draw enemy
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
        
        // Health bar
        const barWidth = 30;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = 'red';
        ctx.fillRect(-barWidth/2, -25, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(-barWidth/2, -25, barWidth * healthPercent, barHeight);
        
        ctx.restore();
    }
    
    takeDamage(damage) {
        this.health -= damage;
        this.hitAnimation = 10;
        
        // Knockback effect
        this.velocity.x += (Math.random() - 0.5) * 5;
        this.velocity.y -= Math.random() * 3;
    }
}

// =====================================
// BLOCK CLASS
// =====================================

export class Block extends GameObject {
    constructor(x, y, width, height, type) {
        super(x, y, width, height);
        this.type = type;
        this.health = CONFIG.BLOCK_TYPES[type].health;
        this.maxHealth = this.health;
        this.color = CONFIG.BLOCK_TYPES[type].color;
        this.onGround = false;
    }
    
    update() {
        // Apply gravity if not on ground
        if (!this.onGround) {
            this.velocity.y += CONFIG.GRAVITY;
        }
        
        super.update();
        
        if (this.health <= 0) {
            this.isDestroyed = true;
            if (window.game && window.game.createParticles) {
                window.game.createParticles(this.position.x + this.width/2, this.position.y + this.height/2, '💥');
                
                // Play destroy sound
                if (window.soundManager) {
                    window.soundManager.playDestroySound();
                }
            }
        }
    }
    
    draw(ctx) {
        const healthPercent = this.health / this.maxHealth;
        const alpha = 0.3 + (healthPercent * 0.7);
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.globalAlpha = 1;
        
        // Border
        ctx.strokeStyle = darkenColor(this.color, 0.3);
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
    }
    
    takeDamage(damage) {
        this.health -= damage;
        
        // Particle effect on hit
        if (window.game && window.game.createParticles) {
            window.game.createParticles(this.position.x + this.width/2, this.position.y + this.height/2, '💥', 3);
        }
    }
}
