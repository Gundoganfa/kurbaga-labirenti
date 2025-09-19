/**
 * ANGRY MEATBALLS - Slingshot System
 * Sapan sistemi ve kontrolleri
 */

import { Vector2D } from './physics.js';
import { CONFIG } from './config.js';
import { Meatball } from './gameObjects.js';

// =====================================
// SLINGSHOT CLASS
// =====================================

export class Slingshot {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.isDragging = false;
        this.currentMeatball = null;
        this.dragPosition = new Vector2D(x, y);
        this.power = 0;
        this.angle = 0;
        this.maxStretch = CONFIG.MAX_STRETCH;
    }
    
    init() {
        // Load first meatball when game starts
        this.loadMeatball();
    }
    
    startDrag(mousePos) {
        if (window.game && window.game.state.meatballsLeft > 0 && this.currentMeatball) {
            this.isDragging = true;
        }
    }
    
    updateDrag(mousePos) {
        if (this.isDragging && this.currentMeatball) {
            // Calculate drag vector
            const dragVector = new Vector2D(
                mousePos.x - this.position.x,
                mousePos.y - this.position.y
            );
            
            // Limit drag distance
            const distance = Math.min(dragVector.magnitude(), this.maxStretch);
            dragVector.normalize().multiply(distance);
            
            this.dragPosition.x = this.position.x + dragVector.x;
            this.dragPosition.y = this.position.y + dragVector.y;
            
            // Calculate power and angle
            this.power = (distance / this.maxStretch) * 100;
            this.angle = Math.atan2(dragVector.y, dragVector.x) * (180 / Math.PI);
            
            // Update meatball position
            this.currentMeatball.position.x = this.dragPosition.x;
            this.currentMeatball.position.y = this.dragPosition.y;
            
            // Update UI
            this.updateUI();
        }
    }
    
    releaseDrag() {
        if (this.isDragging && this.currentMeatball && window.game) {
            // Play launch sound
            if (window.soundManager) {
                window.soundManager.playLaunchSound();
            }
            
            // Calculate launch velocity
            const launchVector = new Vector2D(
                this.position.x - this.dragPosition.x,
                this.position.y - this.dragPosition.y
            );
            
            const powerMultiplier = CONFIG.SLINGSHOT_POWER * (this.power / 100);
            launchVector.normalize().multiply(powerMultiplier);
            
            // Apply type-specific power
            const meatballType = CONFIG.MEATBALL_TYPES[this.currentMeatball.type];
            launchVector.multiply(meatballType.power);
            
            // Launch meatball
            this.currentMeatball.velocity = launchVector;
            window.game.objects.push(this.currentMeatball);
            
            // Update game state
            window.game.state.useMeatball();
            
            // Reset slingshot
            this.currentMeatball = null;
            this.isDragging = false;
            this.power = 0;
            this.angle = 0;
            
            // Load next meatball if available
            if (window.game.state.meatballsLeft > 0) {
                this.loadMeatball();
            }
            
            // Update UI
            this.updateUI();
        }
    }
    
    loadMeatball() {
        // Create new meatball based on current level
        const meatballType = this.getMeatballTypeForLevel();
        this.currentMeatball = new Meatball(this.position.x, this.position.y, meatballType);
    }
    
    getMeatballTypeForLevel() {
        // Simple progression: normal -> explosive -> speedy -> ice
        const types = Object.keys(CONFIG.MEATBALL_TYPES);
        const usedCount = window.game ? window.game.state.meatballsUsed : 0;
        return types[usedCount % types.length];
    }
    
    draw(ctx) {
        // Draw slingshot base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.position.x - 15, this.position.y + 10, 30, 60);
        
        // Draw slingshot arms
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(this.position.x - 10, this.position.y + 10);
        ctx.lineTo(this.position.x - 15, this.position.y - 40);
        ctx.moveTo(this.position.x + 10, this.position.y + 10);
        ctx.lineTo(this.position.x + 15, this.position.y - 40);
        ctx.stroke();
        
        // Draw rubber band (always visible)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.position.x - 15, this.position.y - 40);
        if (this.isDragging && this.currentMeatball) {
            ctx.lineTo(this.dragPosition.x, this.dragPosition.y);
        } else {
            ctx.lineTo(this.position.x, this.position.y - 20);
        }
        ctx.lineTo(this.position.x + 15, this.position.y - 40);
        ctx.stroke();
        
        // Draw current meatball
        if (this.currentMeatball) {
            this.currentMeatball.draw(ctx);
        }
        
        // Draw trajectory preview when dragging
        if (this.isDragging && this.currentMeatball) {
            this.drawTrajectoryPreview(ctx);
        }
    }
    
    drawTrajectoryPreview(ctx) {
        if (!this.currentMeatball || !window.game) return;
        
        const launchVector = new Vector2D(
            this.position.x - this.dragPosition.x,
            this.position.y - this.dragPosition.y
        );
        
        const powerMultiplier = CONFIG.SLINGSHOT_POWER * (this.power / 100);
        launchVector.normalize().multiply(powerMultiplier);
        
        // Simulate trajectory
        let pos = new Vector2D(this.dragPosition.x, this.dragPosition.y);
        let vel = launchVector.copy();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        
        for (let i = 0; i < 150; i++) { // Increased from 100 to 150 for longer trajectory
            vel.y += CONFIG.GRAVITY;
            vel.multiply(CONFIG.AIR_RESISTANCE);
            pos.add(vel);
            
            if (i % 4 === 0) { // Reduced from 5 to 4 for more detailed trajectory
                ctx.lineTo(pos.x, pos.y);
            }
            
            if (pos.x > window.game.canvas.width || pos.y > window.game.canvas.height) break;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    updateUI() {
        // Update power meter
        const powerFill = document.getElementById('powerFill');
        const powerValue = document.getElementById('powerValue');
        if (powerFill && powerValue) {
            powerFill.style.width = `${this.power}%`;
            powerValue.textContent = `${Math.round(this.power)}%`;
        }
        
        // Update angle display
        const angleValue = document.getElementById('angleValue');
        if (angleValue) {
            angleValue.textContent = `${Math.round(this.angle)}°`;
        }
    }
}
