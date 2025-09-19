/**
 * ANGRY MEATBALLS - Physics Engine
 * Fizik motoru ve matematik yardımcıları
 */

// =====================================
// VECTOR 2D CLASS
// =====================================

export class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }
    
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }
    
    distance(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    copy() {
        return new Vector2D(this.x, this.y);
    }
}

// =====================================
// COLLISION DETECTION
// =====================================

export class CollisionDetector {
    static circleRectCollision(circle, rect) {
        const circleX = circle.position.x;
        const circleY = circle.position.y;
        const radius = circle.radius;
        
        const rectX = rect.position.x;
        const rectY = rect.position.y;
        const rectWidth = rect.width;
        const rectHeight = rect.height;
        
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        
        const distance = Math.sqrt((circleX - closestX) ** 2 + (circleY - closestY) ** 2);
        
        return distance < radius;
    }
    
    static circleCircleCollision(circle1, circle2) {
        const distance = circle1.position.distance(circle2.position);
        return distance < (circle1.radius + circle2.radius);
    }
    
    static rectRectCollision(rect1, rect2) {
        return (rect1.position.x < rect2.position.x + rect2.width &&
                rect1.position.x + rect1.width > rect2.position.x &&
                rect1.position.y < rect2.position.y + rect2.height &&
                rect1.position.y + rect1.height > rect2.position.y);
    }
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

export function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

export function darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
}
