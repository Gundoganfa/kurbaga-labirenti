// ===== KEBAPCI USTASI - GAME LOGIC =====

// Game State Management
class GameManager {
    constructor() {
        this.state = 'playing';
        this.gameTime = 0;
        this.maxGameTime = 180;
        this.money = 50;
        this.reputation = 5.0;
        this.streak = 0;
        this.devMode = false;
        this.soundEnabled = true;
        this.difficulty = 'medium';
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeGame();
            });
        } else {
            this.initializeGame();
        }
    }
    
    initializeGame() {
        this.setupEventListeners();
        this.inventory = new InventoryManager();
        this.cooking = new CookingManager();
        this.orders = new OrderManager();
        this.ui = new UIManager();
        
        this.startGame();
        this.gameLoop();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('kebapci-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.soundEnabled = settings.sound ?? true;
            this.difficulty = settings.difficulty ?? 'medium';
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            } else if (e.code === 'Digit1') {
                this.cooking.selectGrillSlot(0);
            } else if (e.code === 'Digit2') {
                this.cooking.selectGrillSlot(1);
            } else if (e.code === 'Digit3') {
                this.cooking.selectGrillSlot(2);
            }
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('settings-btn').addEventListener('click', () => this.ui.showSettingsModal());
        document.getElementById('serve-btn').addEventListener('click', () => this.serveOrder());
        
        // Dev mode buttons
        document.getElementById('dev-mode-toggle').addEventListener('click', () => this.toggleDevMode());
        document.getElementById('add-order-btn').addEventListener('click', () => this.orders.addRandomOrder());
        document.getElementById('add-money-btn').addEventListener('click', () => this.addMoney(100));
        document.getElementById('cook-all-btn').addEventListener('click', () => this.cooking.cookAllToIdeal());
        
        // Settings
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.saveSettings();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('menu-btn').addEventListener('click', () => this.restart());
    }
    
    saveSettings() {
        localStorage.setItem('kebapci-settings', JSON.stringify({
            sound: this.soundEnabled,
            difficulty: this.difficulty
        }));
    }
    
    startGame() {
        this.state = 'playing';
        this.gameTime = 0;
        this.money = 50;
        this.reputation = 5.0;
        this.streak = 0;
        
        // Generate initial orders
        for (let i = 0; i < 2; i++) {
            setTimeout(() => this.orders.addRandomOrder(), i * 1000);
        }
        
        this.ui.updateStats();
        this.ui.showNotification('🎮 Kebapçı Ustası oyunu başladı!', 'success');
    }
    
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pause-btn').textContent = '▶️';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pause-btn').textContent = '⏸️';
        }
    }
    
    gameLoop() {
        if (this.state === 'playing') {
            this.gameTime++;
            this.cooking.update();
            this.orders.update();
            this.ui.updateStats();
            this.ui.updateTime();
            
            if (this.gameTime >= this.maxGameTime) {
                this.endGame();
                return;
            }
            
            // Add new orders periodically
            if (this.gameTime % 25 === 0) {
                this.orders.addRandomOrder();
            }
        }
        
        setTimeout(() => this.gameLoop(), 1000);
    }
    
    serveOrder() {
        const selectedOrder = this.orders.getSelectedOrder();
        if (!selectedOrder) {
            this.ui.showNotification('⚠️ Önce bir sipariş seçin!', 'warning');
            return;
        }
        
        const preparedItems = this.cooking.getPreparedItems();
        const result = this.orders.checkOrder(selectedOrder, preparedItems);
        
        if (result.success) {
            this.money += result.payment;
            this.reputation = Math.min(5.0, this.reputation + 0.1);
            this.streak++;
            
            this.ui.showNotification(`✅ Harika! +${result.payment}₺`, 'success');
            this.cooking.clearPreparedItems();
            this.orders.completeOrder(selectedOrder.id);
        } else {
            this.reputation = Math.max(1.0, this.reputation - 0.2);
            this.streak = 0;
            this.ui.showNotification(`❌ ${result.message}`, 'error');
        }
    }
    
    addMoney(amount) {
        this.money += amount;
        this.ui.updateStats();
    }
    
    endGame() {
        this.state = 'results';
        this.saveHighScore();
        this.ui.showResultsModal();
    }
    
    restart() {
        this.cooking.reset();
        this.orders.reset();
        this.ui.hideAllModals();
        this.startGame();
    }
    
    toggleDevMode() {
        this.devMode = !this.devMode;
        document.getElementById('dev-overlay').classList.toggle('hidden', !this.devMode);
        const btn = document.getElementById('dev-mode-toggle');
        btn.textContent = this.devMode ? '🐛 Dev Mode: ON' : '🐛 Geliştirici Modu';
    }
    
    saveHighScore() {
        const score = this.money + (this.reputation * 100);
        const saved = localStorage.getItem('kebapci-highscore');
        const currentHigh = saved ? parseInt(saved) : 0;
        
        if (score > currentHigh) {
            localStorage.setItem('kebapci-highscore', score.toString());
            return true;
        }
        return false;
    }
}

// Recipe System
class RecipeManager {
    static recipes = {
        'adana-kebap': {
            name: 'Adana Kebap',
            icon: '🍖',
            ingredients: { 'kiyma': 1, 'sis': 1, 'lavas': 1 },
            basePrice: 25
        },
        'tavuk-sis': {
            name: 'Tavuk Şiş',
            icon: '🍗',
            ingredients: { 'tavuk': 1, 'sis': 1, 'lavas': 1 },
            basePrice: 20
        },
        'lahmacun': {
            name: 'Lahmacun',
            icon: '🥙',
            ingredients: { 'hamur': 1, 'harc': 1 },
            basePrice: 15
        },
        'doner-durum': {
            name: 'Döner Dürüm',
            icon: '🌯',
            ingredients: { 'doner': 1, 'lavas': 1 },
            basePrice: 18
        }
    };
    
    static getRecipe(name) {
        return this.recipes[name];
    }
    
    static getAllRecipes() {
        return Object.keys(this.recipes).map(key => ({
            id: key,
            ...this.recipes[key]
        }));
    }
}

// Inventory Management
class InventoryManager {
    constructor() {
        this.ingredients = {
            'kiyma': { name: 'Kıyma', icon: '🥩', count: -1 },
            'tavuk': { name: 'Tavuk', icon: '🍗', count: -1 },
            'doner': { name: 'Döner', icon: '🥙', count: -1 },
            'sis': { name: 'Şiş', icon: '🍢', count: -1 },
            'lavas': { name: 'Lavaş', icon: '🫓', count: -1 },
            'hamur': { name: 'Hamur', icon: '🥐', count: -1 },
            'harc': { name: 'Harç', icon: '🍅', count: -1 }
        };
        
        this.render();
    }
    
    render() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) {
            console.error('Inventory grid element not found!');
            return;
        }
        
        grid.innerHTML = '';
        
        Object.entries(this.ingredients).forEach(([id, ingredient]) => {
            const card = document.createElement('div');
            card.className = 'ingredient-card';
            card.draggable = true;
            card.dataset.ingredient = id;
            
            card.innerHTML = `
                <span class="ingredient-icon">${ingredient.icon}</span>
                <span class="ingredient-name">${ingredient.name}</span>
            `;
            
            // Add drag event listeners
            card.addEventListener('dragstart', (e) => {
                console.log('Drag started for:', id);
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.effectAllowed = 'copy';
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', (e) => {
                console.log('Drag ended for:', id);
                card.classList.remove('dragging');
            });
            
            // Add mouse events for visual feedback
            card.addEventListener('mousedown', () => {
                card.style.cursor = 'grabbing';
            });
            
            card.addEventListener('mouseup', () => {
                card.style.cursor = 'grab';
            });
            
            grid.appendChild(card);
        });
        
        console.log('Rendered', Object.keys(this.ingredients).length, 'ingredient cards');
    }
    
    getIngredient(id) {
        return this.ingredients[id];
    }
}

// Cooking Station Management
class CookingManager {
    constructor() {
        this.stations = {
            prep: [null, null],
            grill: [null, null, null],
            oven: [null, null]
        };
        
        this.setupDragDrop();
        this.setupHeatControls();
        this.renderAllSlots();
    }
    
    setupDragDrop() {
        // Wait for DOM to be ready, then setup drag and drop
        setTimeout(() => {
            document.querySelectorAll('.slot').forEach(slot => {
                slot.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    slot.classList.add('drag-over');
                });
                
                slot.addEventListener('dragleave', () => {
                    slot.classList.remove('drag-over');
                });
                
                slot.addEventListener('drop', (e) => {
                    e.preventDefault();
                    slot.classList.remove('drag-over');
                    
                    const ingredientId = e.dataTransfer.getData('text/plain');
                    const ingredient = game.inventory.getIngredient(ingredientId);
                    
                    if (ingredient) {
                        const stationType = slot.classList.contains('prep-slot') ? 'prep' :
                                          slot.classList.contains('grill-slot') ? 'grill' : 'oven';
                        const slotIndex = parseInt(slot.dataset.slot);
                        
                        this.addToSlot(stationType, slotIndex, { type: ingredientId, ...ingredient });
                    }
                });
            });
        }, 100);
    }
    
    setupHeatControls() {
        document.querySelectorAll('.heat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = e.target.closest('.grill-slot');
                const slotIndex = parseInt(slot.dataset.slot);
                const heat = e.target.dataset.heat;
                
                slot.querySelectorAll('.heat-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.stations.grill[slotIndex]) {
                    this.stations.grill[slotIndex].heatLevel = heat;
                }
            });
        });
    }
    
    addToSlot(stationType, slotIndex, ingredient) {
        if (this.stations[stationType][slotIndex]) return false;
        
        const item = {
            ...ingredient,
            startTime: Date.now(),
            cookTime: 0,
            state: 'raw',
            heatLevel: stationType === 'grill' ? 'medium' : 'fixed'
        };
        
        this.stations[stationType][slotIndex] = item;
        this.renderSlot(stationType, slotIndex);
        game.ui.showNotification(`${ingredient.name} eklendi`, 'success');
        return true;
    }
    
    renderSlot(stationType, slotIndex) {
        const slotId = `${stationType}-${slotIndex}`;
        const slotEl = document.getElementById(slotId);
        if (!slotEl) return;
        
        const item = this.stations[stationType][slotIndex];
        
        if (!item) {
            slotEl.classList.remove('occupied');
            const placeholder = stationType === 'prep' ? 'Hazırlık' :
                              stationType === 'grill' ? `Ocak ${slotIndex + 1}` : `Fırın ${slotIndex + 1}`;
            
            let content = `<div class="slot-placeholder">${placeholder}</div>`;
            if (stationType !== 'prep') {
                content += '<div class="progress-bar"><div class="progress-fill"></div></div>';
            }
            if (stationType === 'grill') {
                content += this.getHeatControlHTML(slotIndex);
            }
            slotEl.innerHTML = content;
        } else {
            slotEl.classList.add('occupied');
            const progress = this.getItemProgress(item);
            const progressClass = progress > 90 ? 'danger' : progress > 70 ? 'warning' : '';
            
            let content = `
                <div class="slot-content">
                    <span style="font-size: 1.5em">${item.icon}</span>
                    <span style="font-size: 0.8em">${item.name}</span>
                    <span style="font-size: 0.7em">${item.state}</span>
                </div>
            `;
            
            if (stationType !== 'prep') {
                content += `<div class="progress-bar"><div class="progress-fill ${progressClass}" style="width: ${progress}%"></div></div>`;
            }
            if (stationType === 'grill') {
                content += this.getHeatControlHTML(slotIndex);
            }
            
            slotEl.innerHTML = content;
            slotEl.className = `slot ${stationType}-slot occupied cooking-state-${item.state}`;
        }
    }
    
    renderAllSlots() {
        Object.entries(this.stations).forEach(([stationType, slots]) => {
            slots.forEach((_, slotIndex) => {
                this.renderSlot(stationType, slotIndex);
            });
        });
    }
    
    getHeatControlHTML(slotIndex) {
        const item = this.stations.grill[slotIndex];
        const currentHeat = item?.heatLevel || 'medium';
        
        return `
            <div class="heat-control">
                <button class="heat-btn ${currentHeat === 'low' ? 'active' : ''}" data-heat="low">🔥</button>
                <button class="heat-btn ${currentHeat === 'medium' ? 'active' : ''}" data-heat="medium">🔥🔥</button>
                <button class="heat-btn ${currentHeat === 'high' ? 'active' : ''}" data-heat="high">🔥🔥🔥</button>
            </div>
        `;
    }
    
    getItemProgress(item) {
        if (!item || item.cookTime === 0) return 0;
        const maxTime = 60;
        return Math.min((item.cookTime / maxTime) * 100, 100);
    }
    
    update() {
        ['grill', 'oven'].forEach(stationType => {
            this.stations[stationType].forEach((item, slotIndex) => {
                if (item) {
                    const elapsed = (Date.now() - item.startTime) / 1000;
                    const heatMultiplier = item.heatLevel === 'low' ? 0.8 : item.heatLevel === 'high' ? 1.2 : 1.0;
                    item.cookTime = elapsed * heatMultiplier;
                    
                    const oldState = item.state;
                    if (item.cookTime < 15) item.state = 'cooking';
                    else if (item.cookTime < 35) item.state = 'done';
                    else item.state = 'burnt';
                    
                    if (oldState !== item.state) {
                        this.renderSlot(stationType, slotIndex);
                        if (item.state === 'done') {
                            game.ui.showNotification(`✅ ${item.name} hazır!`, 'success');
                        } else if (item.state === 'burnt') {
                            game.ui.showNotification(`🔥 ${item.name} yandı!`, 'error');
                        }
                    }
                }
            });
        });
    }
    
    selectGrillSlot(index) {
        document.querySelectorAll('.grill-slot').forEach((slot, i) => {
            slot.classList.toggle('selected', i === index);
        });
    }
    
    getPreparedItems() {
        const items = [];
        Object.entries(this.stations).forEach(([stationType, slots]) => {
            slots.forEach((item) => {
                if (item && (stationType === 'prep' || item.state === 'done')) {
                    items.push(item);
                }
            });
        });
        return items;
    }
    
    clearPreparedItems() {
        Object.entries(this.stations).forEach(([stationType, slots]) => {
            slots.forEach((item, slotIndex) => {
                if (item && (stationType === 'prep' || item.state === 'done')) {
                    this.stations[stationType][slotIndex] = null;
                    this.renderSlot(stationType, slotIndex);
                }
            });
        });
    }
    
    reset() {
        this.stations = {
            prep: [null, null],
            grill: [null, null, null],
            oven: [null, null]
        };
        this.renderAllSlots();
    }
    
    cookAllToIdeal() {
        Object.entries(this.stations).forEach(([stationType, slots]) => {
            slots.forEach((item, slotIndex) => {
                if (item && stationType !== 'prep') {
                    item.state = 'done';
                    item.cookTime = 25;
                    this.renderSlot(stationType, slotIndex);
                }
            });
        });
    }
}

// Order Management
class OrderManager {
    constructor() {
        this.orders = [];
        this.nextOrderId = 1;
        this.selectedOrderId = null;
        this.customerNames = ['Ali', 'Ayşe', 'Mehmet', 'Fatma', 'Ahmet', 'Zeynep'];
        this.customerEmojis = ['👨', '👩', '👦', '👧', '🧔', '👱‍♀️'];
    }
    
    addRandomOrder() {
        const recipes = RecipeManager.getAllRecipes();
        const recipe = recipes[Math.floor(Math.random() * recipes.length)];
        
        const order = {
            id: this.nextOrderId++,
            recipeId: recipe.id,
            recipe: recipe,
            customer: {
                name: this.customerNames[Math.floor(Math.random() * this.customerNames.length)],
                emoji: this.customerEmojis[Math.floor(Math.random() * this.customerEmojis.length)]
            },
            timeLimit: 60,
            timeRemaining: 60,
            reward: recipe.basePrice + Math.floor(Math.random() * 10)
        };
        
        this.orders.push(order);
        this.renderOrders();
        game.ui.showNotification(`📋 Yeni sipariş: ${recipe.name}`, 'info');
    }
    
    renderOrders() {
        const queue = document.getElementById('orders-queue');
        queue.innerHTML = '';
        
        this.orders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card ${this.selectedOrderId === order.id ? 'selected' : ''}`;
            
            const timePercentage = (order.timeRemaining / order.timeLimit) * 100;
            
            card.innerHTML = `
                <div class="order-customer">
                    <span class="customer-avatar">${order.customer.emoji}</span>
                    <span class="customer-name">${order.customer.name}</span>
                </div>
                <div class="order-item">${order.recipe.icon} ${order.recipe.name}</div>
                <div class="order-timer">
                    <div class="timer-fill" style="width: ${timePercentage}%"></div>
                </div>
                <div class="order-reward">~${order.reward}₺</div>
            `;
            
            card.addEventListener('click', () => this.selectOrder(order.id));
            
            card.addEventListener('dblclick', () => {
                game.ui.showRecipeModal(order.recipe);
            });
            
            queue.appendChild(card);
        });
        
        document.getElementById('serve-btn').disabled = this.selectedOrderId === null;
        document.getElementById('order-count').textContent = this.orders.length;
    }
    
    selectOrder(orderId) {
        this.selectedOrderId = orderId;
        this.renderOrders();
        
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            game.ui.showNotification(`📋 Seçilen: ${order.recipe.name}`, 'info');
        }
    }
    
    getSelectedOrder() {
        return this.orders.find(o => o.id === this.selectedOrderId);
    }
    
    checkOrder(order, preparedItems) {
        const recipe = order.recipe;
        const requiredIngredients = recipe.ingredients;
        const availableIngredients = {};
        
        preparedItems.forEach(item => {
            const ingredientId = item.type;
            availableIngredients[ingredientId] = (availableIngredients[ingredientId] || 0) + 1;
        });
        
        for (const [ingredient, required] of Object.entries(requiredIngredients)) {
            if ((availableIngredients[ingredient] || 0) < required) {
                return {
                    success: false,
                    message: `Eksik malzeme: ${game.inventory.getIngredient(ingredient)?.name || ingredient}`,
                    payment: 0
                };
            }
        }
        
        const cookedItems = preparedItems.filter(item => item.cookTime > 0);
        const burntItems = cookedItems.filter(item => item.state === 'burnt');
        
        if (burntItems.length > 0) {
            return {
                success: false,
                message: 'Malzemeler yanmış!',
                payment: 0
            };
        }
        
        let payment = order.reward;
        if (order.timeRemaining > order.timeLimit * 0.7) {
            payment += Math.floor(payment * 0.2);
        }
        
        return {
            success: true,
            payment: payment
        };
    }
    
    completeOrder(orderId) {
        this.orders = this.orders.filter(o => o.id !== orderId);
        this.selectedOrderId = null;
        this.renderOrders();
    }
    
    update() {
        this.orders.forEach(order => {
            order.timeRemaining = Math.max(0, order.timeRemaining - 1);
            if (order.timeRemaining <= 0) {
                game.ui.showNotification(`⏰ ${order.recipe.name} siparişi iptal oldu!`, 'error');
                this.completeOrder(order.id);
                game.reputation = Math.max(1.0, game.reputation - 0.3);
            }
        });
        this.renderOrders();
    }
    
    reset() {
        this.orders = [];
        this.selectedOrderId = null;
        this.renderOrders();
    }
}

// UI Management
class UIManager {
    constructor() {
        this.setupModals();
    }
    
    setupModals() {
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.hideAllModals());
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideAllModals();
            });
        });
    }
    
    updateStats() {
        document.getElementById('money').textContent = `${game.money}₺`;
        document.getElementById('reputation').textContent = game.reputation.toFixed(1);
    }
    
    updateTime() {
        const minutes = Math.floor((game.maxGameTime - game.gameTime) / 60);
        const seconds = (game.maxGameTime - game.gameTime) % 60;
        document.getElementById('game-time').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showSettingsModal() {
        document.getElementById('settings-modal').classList.remove('hidden');
        document.getElementById('sound-toggle').checked = game.soundEnabled;
        document.getElementById('difficulty').value = game.difficulty;
    }
    
    showRecipeModal(recipe) {
        document.getElementById('recipe-modal').classList.remove('hidden');
        document.getElementById('recipe-title').textContent = `${recipe.icon} ${recipe.name}`;
        
        const content = document.getElementById('recipe-content');
        const ingredients = Object.entries(recipe.ingredients)
            .map(([id, count]) => `${count}x ${game.inventory.getIngredient(id)?.name || id}`)
            .join('<br>');
        
        content.innerHTML = `
            <h4>Gerekli Malzemeler:</h4>
            <p>${ingredients}</p>
            <h4>Fiyat:</h4>
            <p>${recipe.basePrice}₺</p>
        `;
    }
    
    showResultsModal() {
        const modal = document.getElementById('results-modal');
        const score = Math.floor(game.money + (game.reputation * 100));
        
        document.getElementById('final-score').innerHTML = `
            <h2>Final Skor: ${score}</h2>
        `;
        
        document.getElementById('score-breakdown').innerHTML = `
            <p><strong>Para:</strong> ${game.money}₺</p>
            <p><strong>İtibar:</strong> ${game.reputation.toFixed(1)} ⭐</p>
            <p><strong>Seri:</strong> ${game.streak} 🔥</p>
        `;
        
        modal.classList.remove('hidden');
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
}

// Initialize Game
const game = new GameManager();
