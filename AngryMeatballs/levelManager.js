/**
 * ANGRY MEATBALLS - Level Manager
 * Seviye yönetimi ve level verileri
 */

import { Enemy, Block } from './gameObjects.js';

// =====================================
// LEVEL MANAGER CLASS
// =====================================

export class LevelManager {
    constructor(game) {
        this.game = game;
        this.levels = this.createLevels();
    }
    
    createLevels() {
        return [
            // Level 1: Simple introduction
            {
                name: "Sebze Bahçesi",
                description: "🥕 Havuçları yok et!",
                enemies: [
                    { type: 'CARROT', x: 800, y: 510 },
                    { type: 'CARROT', x: 850, y: 510 }
                ],
                blocks: [
                    { type: 'WOOD', x: 780, y: 510, width: 40, height: 40 },
                    { type: 'WOOD', x: 830, y: 510, width: 40, height: 40 }
                ]
            },
            // Level 2: More complex
            {
                name: "Brokoli Kalesi",
                description: "🥦 Brokoli kalelerini yık!",
                enemies: [
                    { type: 'BROCCOLI', x: 880, y: 200 },   // Will fall on stone block
                    { type: 'CARROT', x: 950, y: 200 },     // Will fall to ground
                    { type: 'CARROT', x: 1000, y: 200 }     // Will fall to ground
                ],
                blocks: [
                    { type: 'STONE', x: 880, y: 510, width: 40, height: 40 },   // Ground level
                    { type: 'WOOD', x: 880, y: 300, width: 40, height: 40 },    // Will fall on stone
                    { type: 'GLASS', x: 960, y: 510, width: 40, height: 40 }    // Ground level
                ]
            },
            // Level 3: Advanced
            {
                name: "Lahana İmparatorluğu",
                description: "🥬 Sebze imparatorluğunu yık!",
                enemies: [
                    { type: 'CABBAGE', x: 920, y: 200 },        // Will fall to top of structure
                    { type: 'BROCCOLI', x: 880, y: 200 },       // Will fall on blocks
                    { type: 'BROCCOLI', x: 960, y: 200 },       // Will fall on blocks
                    { type: 'CARROT', x: 850, y: 200 },         // Will fall to ground
                    { type: 'CARROT', x: 1050, y: 200 }         // Will fall to ground
                ],
                blocks: [
                    { type: 'STONE', x: 880, y: 510, width: 40, height: 40 },  // Ground level foundation
                    { type: 'STONE', x: 920, y: 510, width: 40, height: 40 },  // Ground level foundation
                    { type: 'STONE', x: 960, y: 510, width: 40, height: 40 },  // Ground level foundation
                    { type: 'WOOD', x: 900, y: 300, width: 40, height: 40 },   // Will fall to second level
                    { type: 'WOOD', x: 940, y: 300, width: 40, height: 40 },   // Will fall to second level
                    { type: 'GLASS', x: 920, y: 250, width: 40, height: 40 }   // Will fall to top level
                ]
            },
            // Level 4: Tower Challenge
            {
                name: "Yüksek Kule",
                description: "🏗️ Sebze kulesini yık!",
                enemies: [
                    { type: 'CARROT', x: 920, y: 200 },         // Will fall to top platform
                    { type: 'BROCCOLI', x: 920, y: 200 },       // Will fall to middle platform
                    { type: 'CABBAGE', x: 920, y: 200 }         // Will fall to lower platform
                ],
                blocks: [
                    // Bottom layer (ground level)
                    { type: 'STONE', x: 900, y: 510, width: 20, height: 40 },
                    { type: 'STONE', x: 920, y: 510, width: 20, height: 40 },
                    { type: 'STONE', x: 940, y: 510, width: 20, height: 40 },
                    // Middle layer
                    { type: 'WOOD', x: 910, y: 470, width: 20, height: 40 },
                    { type: 'WOOD', x: 930, y: 470, width: 20, height: 40 },
                    // Top layer
                    { type: 'GLASS', x: 920, y: 430, width: 20, height: 40 },
                    // Support beams
                    { type: 'WOOD', x: 900, y: 410, width: 60, height: 20 },
                    { type: 'WOOD', x: 900, y: 350, width: 60, height: 20 }
                ]
            },
            // Level 5: Fortress
            {
                name: "Sebze Kalesi",
                description: "🏰 Büyük kaleyi fethet!",
                enemies: [
                    { type: 'CABBAGE', x: 850, y: 200 },        // Will fall to roof
                    { type: 'CABBAGE', x: 950, y: 200 },        // Will fall to roof
                    { type: 'BROCCOLI', x: 880, y: 200 },       // Will fall to platform
                    { type: 'BROCCOLI', x: 920, y: 200 },       // Will fall to platform
                    { type: 'CARROT', x: 800, y: 200 },         // Will fall to ground
                    { type: 'CARROT', x: 1000, y: 200 }         // Will fall to ground
                ],
                blocks: [
                    // Outer walls (ground to top)
                    { type: 'STONE', x: 780, y: 450, width: 20, height: 60 },
                    { type: 'STONE', x: 1000, y: 450, width: 20, height: 60 },
                    // Inner structure
                    { type: 'STONE', x: 840, y: 470, width: 20, height: 40 },
                    { type: 'STONE', x: 940, y: 470, width: 20, height: 40 },
                    { type: 'WOOD', x: 860, y: 490, width: 80, height: 20 },    // Platform
                    { type: 'WOOD', x: 860, y: 400, width: 80, height: 20 },    // Upper platform
                    // Roof
                    { type: 'GLASS', x: 820, y: 380, width: 160, height: 20 }
                ]
            }
        ];
    }
    
    loadLevel(levelNumber) {
        const levelData = this.levels[levelNumber - 1];
        if (!levelData) return false;
        
        // Clear existing objects
        this.game.objects = [];
        this.game.particleSystem.clear();
        
        // Load enemies
        levelData.enemies.forEach(enemyData => {
            this.game.objects.push(new Enemy(enemyData.x, enemyData.y, enemyData.type));
        });
        
        // Load blocks
        levelData.blocks.forEach(blockData => {
            this.game.objects.push(new Block(blockData.x, blockData.y, blockData.width, blockData.height, blockData.type));
        });
        
        // Update UI
        const levelElement = document.getElementById('level');
        const levelInfoElement = document.getElementById('levelInfo');
        
        if (levelElement) {
            levelElement.textContent = levelNumber;
        }
        
        if (levelInfoElement) {
            levelInfoElement.innerHTML = `
                <h4>Seviye ${levelNumber}: ${levelData.name}</h4>
                <p>${levelData.description}</p>
            `;
        }
        
        return true;
    }
    
    checkLevelComplete() {
        // Check if all enemies are destroyed
        const enemiesLeft = this.game.objects.filter(obj => obj instanceof Enemy && !obj.isDestroyed).length;
        return enemiesLeft === 0;
    }
    
    calculateStars(meatballsUsed) {
        if (meatballsUsed <= 1) return 3;
        if (meatballsUsed <= 3) return 2;
        return 1;
    }
    
    getTotalLevels() {
        return this.levels.length;
    }
    
    getLevelData(levelNumber) {
        return this.levels[levelNumber - 1];
    }
}
