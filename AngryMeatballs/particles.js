/**
 * ANGRY MEATBALLS - Particle System
 * Parçacık sistemi ve efektler
 */

// =====================================
// PARTICLE CLASS
// =====================================

export class Particle {
    constructor(x, y, text = '💥', vx = 0, vy = 0, life = 60) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.text = text;
        this.life = life;
        this.maxLife = life;
        this.size = 20;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.scale = 1;
    }
    
    update() {
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Apply gravity
        this.vy += 0.2;
        
        // Apply friction
        this.vx *= 0.98;
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Update scale based on life
        this.scale = this.life / this.maxLife;
        
        // Decrease life
        this.life--;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);
        
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// =====================================
// EXPLOSION PARTICLE
// =====================================

export class ExplosionParticle extends Particle {
    constructor(x, y, color = '#FF6B35') {
        const vx = (Math.random() - 0.5) * 15;
        const vy = (Math.random() - 0.5) * 15 - 5;
        super(x, y, '💥', vx, vy, 30);
        
        this.color = color;
        this.radius = Math.random() * 8 + 4;
        this.maxRadius = this.radius;
    }
    
    update() {
        super.update();
        
        // Expand then contract
        const lifePercent = this.life / this.maxLife;
        if (lifePercent > 0.7) {
            this.radius = this.maxRadius * (1 - lifePercent) * 5;
        } else {
            this.radius = this.maxRadius * lifePercent;
        }
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw explosion circle
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, '#FF8C42');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// =====================================
// SMOKE PARTICLE
// =====================================

export class SmokeParticle extends Particle {
    constructor(x, y) {
        const vx = (Math.random() - 0.5) * 2;
        const vy = -Math.random() * 3 - 1;
        super(x, y, '💨', vx, vy, 80);
        
        this.opacity = 0.8;
        this.expansionRate = 0.02;
    }
    
    update() {
        super.update();
        
        // Smoke rises and expands
        this.vy -= 0.05; // Buoyancy
        this.size += this.expansionRate;
        this.opacity = (this.life / this.maxLife) * 0.8;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Draw smoke cloud
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// =====================================
// STAR PARTICLE (for scores)
// =====================================

export class StarParticle extends Particle {
    constructor(x, y, points) {
        const vx = (Math.random() - 0.5) * 4;
        const vy = -Math.random() * 8 - 3;
        super(x, y, `+${points}`, vx, vy, 90);
        
        this.points = points;
        this.fontSize = 16;
        this.color = points >= 300 ? '#FFD700' : points >= 200 ? '#FFA500' : '#90EE90';
    }
    
    update() {
        super.update();
        
        // Float upward
        this.vy -= 0.1;
        this.vx *= 0.95;
        
        // Grow then shrink
        const lifePercent = this.life / this.maxLife;
        if (lifePercent > 0.8) {
            this.fontSize = 16 * (1 - (1 - lifePercent) * 5);
        } else {
            this.fontSize = 16 * lifePercent;
        }
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.restore();
    }
}

// =====================================
// PARTICLE SYSTEM MANAGER
// =====================================

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    addParticle(particle) {
        this.particles.push(particle);
    }
    
    createExplosion(x, y, count = 10, radius = 80) {
        // Main explosion particles
        for (let i = 0; i < count; i++) {
            this.addParticle(new ExplosionParticle(x, y));
        }
        
        // Smoke particles
        for (let i = 0; i < 5; i++) {
            this.addParticle(new SmokeParticle(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20
            ));
        }
        
        // Debris particles
        const debrisEmojis = ['💥', '✨', '🔥', '💨'];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const emoji = debrisEmojis[Math.floor(Math.random() * debrisEmojis.length)];
            
            this.addParticle(new Particle(x, y, emoji, vx, vy, 40));
        }
    }
    
    createImpactEffect(x, y, emoji = '💥', count = 5) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 8;
            const vy = (Math.random() - 0.5) * 8 - 3;
            this.addParticle(new Particle(x, y, emoji, vx, vy, 30));
        }
    }
    
    createScoreEffect(x, y, points) {
        this.addParticle(new StarParticle(x, y, points));
        
        // Add some sparkle effects
        for (let i = 0; i < 3; i++) {
            const vx = (Math.random() - 0.5) * 4;
            const vy = -Math.random() * 4 - 2;
            this.addParticle(new Particle(x, y, '✨', vx, vy, 60));
        }
    }
    
    createDestructionEffect(x, y, material = 'wood') {
        const effectMap = {
            wood: { emoji: '🪵', color: '#8B4513', count: 6 },
            stone: { emoji: '🪨', color: '#696969', count: 8 },
            glass: { emoji: '💎', color: '#87CEEB', count: 10 }
        };
        
        const effect = effectMap[material] || effectMap.wood;
        
        for (let i = 0; i < effect.count; i++) {
            const vx = (Math.random() - 0.5) * 10;
            const vy = (Math.random() - 0.5) * 10 - 3;
            this.addParticle(new Particle(x, y, effect.emoji, vx, vy, 45));
        }
    }
    
    update() {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();
            
            // Remove dead particles
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }
    
    clear() {
        this.particles = [];
    }
    
    getParticleCount() {
        return this.particles.length;
    }
}
