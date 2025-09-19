/**
 * ANGRY MEATBALLS - Game Configuration
 * Oyun ayarları ve sabit değerler
 */

export const CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 600,
    
    // Physics
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.7,
    AIR_RESISTANCE: 0.9995, // Reduced air resistance for longer flights
    
    // Slingshot
    SLINGSHOT_X: 150,
    SLINGSHOT_Y: 450,
    SLINGSHOT_POWER: 25, // Increased from 15 to 25 for more power
    MAX_STRETCH: 120,    // Increased from 100 to 120 for longer stretch
    
    // Meatballs
    MEATBALL_RADIUS: 20,
    MEATBALL_MASS: 1,
    MEATBALL_TYPES: {
        NORMAL: { color: '#8B4513', power: 1, special: null },
        EXPLOSIVE: { color: '#DC143C', power: 1.3, special: 'explode' },
        SPEEDY: { color: '#32CD32', power: 1.5, special: 'speed' },   // Increased for extra speed
        ICE: { color: '#87CEEB', power: 0.9, special: 'freeze' }      // Slightly increased
    },
    
    // Enemies (Vegetables)
    ENEMY_TYPES: {
        CARROT: { health: 1, points: 100, emoji: '🥕' },
        BROCCOLI: { health: 2, points: 200, emoji: '🥦' },
        CABBAGE: { health: 3, points: 300, emoji: '🥬' }
    },
    
    // Blocks
    BLOCK_TYPES: {
        WOOD: { health: 2, color: '#8B4513' },
        STONE: { health: 4, color: '#696969' },
        GLASS: { health: 1, color: '#87CEEB' }
    }
};

export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};
