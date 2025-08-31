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
            // clearPreparedItems() artık checkOrder içinde yapılıyor
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
        // Geleneksel Kebaplar
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
        'kofte-ekmek': {
            name: 'Köfte Ekmek',
            icon: '🍖🍞',
            ingredients: { 'kofte': 2, 'ekmek': 1, 'domates': 1 },
            basePrice: 22
        },
        
        // Dürüm ve Wrap'ler
        'doner-durum': {
            name: 'Döner Dürüm',
            icon: '🌯',
            ingredients: { 'doner': 1, 'lavas': 1 },
            basePrice: 18
        },
        'tavuk-durum': {
            name: 'Tavuk Dürüm',
            icon: '🌯🍗',
            ingredients: { 'tavuk': 1, 'lavas': 1, 'marul': 1 },
            basePrice: 19
        },
        'sucuklu-durum': {
            name: 'Sucuklu Dürüm',
            icon: '🌯🌭',
            ingredients: { 'sucuk': 1, 'lavas': 1, 'kasar': 1 },
            basePrice: 17
        },
        
        // Pideler
        'lahmacun': {
            name: 'Lahmacun',
            icon: '🥙',
            ingredients: { 'hamur': 1, 'harc': 1 },
            basePrice: 15
        },
        'peynirli-pide': {
            name: 'Peynirli Pide',
            icon: '🥖🧀',
            ingredients: { 'pide_hamur': 1, 'beyaz_peynir': 1, 'kasar': 1 },
            basePrice: 20
        },
        'karisik-pide': {
            name: 'Karışık Pide',
            icon: '🥖🍖',
            ingredients: { 'pide_hamur': 1, 'kiyma': 1, 'kasar': 1, 'domates': 1 },
            basePrice: 28
        },
        
        // Tostlar
        'sucuklu-tost': {
            name: 'Sucuklu Tost',
            icon: '🍞🌭',
            ingredients: { 'ekmek': 2, 'sucuk': 1, 'kasar': 1 },
            basePrice: 16
        },
        'karisik-tost': {
            name: 'Karışık Tost',
            icon: '🍞🥬',
            ingredients: { 'ekmek': 2, 'kasar': 1, 'domates': 1, 'marul': 1 },
            basePrice: 18
        },
        
        // Salatalar
        'coban-salata': {
            name: 'Çoban Salata',
            icon: '🥗',
            ingredients: { 'domates': 2, 'salatalik': 1, 'soğan': 1, 'biber': 1 },
            basePrice: 12
        },
        'peynirli-salata': {
            name: 'Peynirli Salata',
            icon: '🥗🧀',
            ingredients: { 'marul': 1, 'domates': 1, 'beyaz_peynir': 1, 'salatalik': 1 },
            basePrice: 14
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
            // Et Ürünleri
            'kiyma': { name: 'Kıyma', icon: '🥩', count: -1 },
            'tavuk': { name: 'Tavuk', icon: '🍗', count: -1 },
            'doner': { name: 'Döner', icon: '🥙', count: -1 },
            'kofte': { name: 'Köfte', icon: '🍖', count: -1 },
            'sucuk': { name: 'Sucuk', icon: '🌭', count: -1 },
            
            // Hamur İşleri
            'sis': { name: 'Şiş', icon: '🍢', count: -1 },
            'lavas': { name: 'Lavaş', icon: '🫓', count: -1 },
            'hamur': { name: 'Hamur', icon: '🥐', count: -1 },
            'pide_hamur': { name: 'Pide Hamuru', icon: '🥖', count: -1 },
            'ekmek': { name: 'Ekmek', icon: '🍞', count: -1 },
            
            // Sebzeler
            'harc': { name: 'Harç', icon: '🍅', count: -1 },
            'soğan': { name: 'Soğan', icon: '🧅', count: -1 },
            'domates': { name: 'Domates', icon: '🍅', count: -1 },
            'salatalik': { name: 'Salatalık', icon: '🥒', count: -1 },
            'marul': { name: 'Marul', icon: '🥬', count: -1 },
            'biber': { name: 'Biber', icon: '🌶️', count: -1 },
            
            // Soslar & Baharatlar
            'baharat': { name: 'Baharat', icon: '🧂', count: -1 },
            'aci_sos': { name: 'Acı Sos', icon: '🌶️', count: -1 },
            'sarmisakli_sos': { name: 'Sarımsaklı Sos', icon: '🧄', count: -1 },
            'mayonez': { name: 'Mayonez', icon: '🥛', count: -1 },
            
            // Peynirler
            'beyaz_peynir': { name: 'Beyaz Peynir', icon: '🧀', count: -1 },
            'kasar': { name: 'Kaşar', icon: '🧀', count: -1 }
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
        
        // Kombinasyon tarifleri
        this.combinations = {
            // Et Kombinasyonları
            'kiyma+baharat': { result: 'marine_kiyma', name: 'Marine Kıyma', icon: '🥩⭐', bonus: 1.2 },
            'tavuk+baharat': { result: 'marine_tavuk', name: 'Marine Tavuk', icon: '🍗⭐', bonus: 1.2 },
            'doner+baharat': { result: 'marine_doner', name: 'Marine Döner', icon: '🥙⭐', bonus: 1.1 },
            'kofte+baharat': { result: 'marine_kofte', name: 'Marine Köfte', icon: '🍖⭐', bonus: 1.25 },
            'sucuk+aci_sos': { result: 'soslu_sucuk', name: 'Soslu Sucuk', icon: '🌭🔥', bonus: 1.15 },
            
            // Hamur Kombinasyonları
            'hamur+soğan': { result: 'ozel_hamur', name: 'Özel Hamur', icon: '🥐⭐', bonus: 1.15 },
            'pide_hamur+kasar': { result: 'peynirli_hamur', name: 'Peynirli Hamur', icon: '🥖🧀', bonus: 1.2 },
            'ekmek+sarmisakli_sos': { result: 'sarmisakli_ekmek', name: 'Sarımsaklı Ekmek', icon: '🍞🧄', bonus: 1.1 },
            
            // Sebze Kombinasyonları
            'domates+soğan': { result: 'salata', name: 'Sebze Salatası', icon: '🍅🧅', bonus: 1.1 },
            'marul+salatalik': { result: 'yesil_salata', name: 'Yeşil Salata', icon: '🥬🥒', bonus: 1.1 },
            'beyaz_peynir+marul': { result: 'peynirli_salata', name: 'Peynirli Salata', icon: '🧀🥬', bonus: 1.15 },
            
            // Sos Kombinasyonları
            'mayonez+sarmisakli_sos': { result: 'ozel_sos', name: 'Özel Sos', icon: '🥛🧄', bonus: 1.1 },
            'aci_sos+baharat': { result: 'ates_sos', name: 'Ateş Sosu', icon: '🌶️🔥', bonus: 1.2 }
        };
        
        this.setupDragDrop();
        this.setupHeatControls();
        this.renderAllSlots();
    }
    
    setupSlotEventListeners(slot) {
        // Remove existing listeners by cloning the node
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        // Preserve draggable state if occupied
        if (newSlot.classList.contains('occupied')) {
            newSlot.draggable = true;
        }
        
        // Add fresh event listeners
        newSlot.addEventListener('dragover', (e) => {
            e.preventDefault();
            newSlot.classList.add('drag-over');
        });
        
        newSlot.addEventListener('dragleave', () => {
            newSlot.classList.remove('drag-over');
        });
        
        newSlot.addEventListener('drop', (e) => {
            e.preventDefault();
            newSlot.classList.remove('drag-over');
            
            const dragData = e.dataTransfer.getData('text/plain');
            console.log('Drop data:', dragData);
            
            const targetStationType = newSlot.classList.contains('prep-slot') ? 'prep' :
                                    newSlot.classList.contains('grill-slot') ? 'grill' : 'oven';
            const targetSlotIndex = parseInt(newSlot.dataset.slot);
            
            // Check if dragging from inventory
            if (!dragData.startsWith('slot:')) {
                const ingredientId = dragData;
                const ingredient = game.inventory.getIngredient(ingredientId);
                
                if (ingredient) {
                    this.addToSlot(targetStationType, targetSlotIndex, { type: ingredientId, ...ingredient });
                }
            } else {
                // Dragging from another slot
                const [, sourceStationType, sourceSlotIndex] = dragData.split(':');
                const sourceItem = this.stations[sourceStationType][parseInt(sourceSlotIndex)];
                
                if (sourceItem && this.moveItem(sourceStationType, parseInt(sourceSlotIndex), targetStationType, targetSlotIndex)) {
                    console.log(`Moved from ${sourceStationType}:${sourceSlotIndex} to ${targetStationType}:${targetSlotIndex}`);
                }
            }
        });
        
        console.log('Event listeners refreshed for slot:', newSlot.className);
        return newSlot;
    }

    setupDragDrop() {
        // Wait for DOM to be ready, then setup drag and drop
        setTimeout(() => {
            document.querySelectorAll('.slot').forEach(slot => {
                this.setupSlotEventListeners(slot);
            });
            
            // Envanter drop zone ekle
            const inventoryGrid = document.getElementById('inventory-grid');
            if (inventoryGrid) {
                inventoryGrid.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    inventoryGrid.classList.add('drag-over-inventory');
                });
                
                inventoryGrid.addEventListener('dragleave', () => {
                    inventoryGrid.classList.remove('drag-over-inventory');
                });
                
                inventoryGrid.addEventListener('drop', (e) => {
                    e.preventDefault();
                    inventoryGrid.classList.remove('drag-over-inventory');
                    
                    const dragData = e.dataTransfer.getData('text/plain');
                    console.log('Dropping to inventory:', dragData);
                    
                    // Sadece slot'tan gelen item'ları kabul et
                    if (dragData.startsWith('slot:')) {
                        const [, fromStationType, fromSlotIndex] = dragData.split(':');
                        this.returnToInventory(fromStationType, parseInt(fromSlotIndex));
                    }
                });
            }
        }, 100);
    }
    
    setupHeatControls() {
        // Event delegation - parent container'a listener ekle
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('heat-btn')) {
                console.log('Heat button clicked:', e.target.dataset.heat);
                
                const slot = e.target.closest('.grill-slot');
                if (!slot) return;
                
                const slotIndex = parseInt(slot.dataset.slot);
                const heat = e.target.dataset.heat;
                
                // Active class güncelle
                slot.querySelectorAll('.heat-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Heat level güncelle
                if (this.stations.grill[slotIndex]) {
                    this.stations.grill[slotIndex].heatLevel = heat;
                    console.log(`Grill ${slotIndex} heat set to: ${heat}`);
                    game.ui.showNotification(`🔥 Ocak ${slotIndex + 1}: ${heat === 'low' ? 'Düşük' : heat === 'medium' ? 'Orta' : 'Yüksek'} ateş`, 'info');
                }
            }
        });
    }
    
    addToSlot(stationType, slotIndex, ingredient) {
        if (this.stations[stationType][slotIndex]) return false;
        
        const item = {
            ...ingredient,
            startTime: Date.now(),
            cookTime: ingredient.type === 'lavas' ? 1 : 0, // Lavaş hazır sayılsın
            state: ingredient.type === 'lavas' ? 'ready' : 'raw',
            heatLevel: stationType === 'grill' ? 'medium' : 'fixed'
        };
        
        this.stations[stationType][slotIndex] = item;
        this.renderSlot(stationType, slotIndex);
        game.ui.showNotification(`${ingredient.name} eklendi`, 'success');
        
        // Tezgâhta kombinasyon kontrol et
        if (stationType === 'prep') {
            setTimeout(() => this.checkPrepCombinations(), 100);
        }
        
        return true;
    }
    
    returnToInventory(stationType, slotIndex) {
        const item = this.stations[stationType][slotIndex];
        if (!item) {
            game.ui.showNotification('❌ Slot boş!', 'error');
            return false;
        }
        
        // Sadece tezgâh malzemelerini geri alabilirsin
        if (stationType !== 'prep') {
            game.ui.showNotification('❌ Sadece tezgâhtaki malzemeler geri alınabilir!', 'warning');
            return false;
        }
        
        // Slot'u temizle
        this.stations[stationType][slotIndex] = null;
        this.renderSlot(stationType, slotIndex);
        
        game.ui.showNotification(`✅ ${item.name} envantere geri eklendi`, 'success');
        console.log(`Returned ${item.name} from ${stationType}:${slotIndex} to inventory`);
        
        return true;
    }
    
    checkPrepCombinations() {
        const prepItems = this.stations.prep.filter(item => item !== null);
        if (prepItems.length !== 2) return; // Sadece 2 malzeme varsa kombinasyon kontrol et
        
        const [item1, item2] = prepItems;
        const combo1 = `${item1.type}+${item2.type}`;
        const combo2 = `${item2.type}+${item1.type}`;
        
        const combination = this.combinations[combo1] || this.combinations[combo2];
        
        if (combination) {
            console.log('Combination found:', combination);
            
            // Kombinasyonu oluştur
            const combinedItem = {
                type: combination.result,
                name: combination.name,
                icon: combination.icon,
                startTime: Date.now(),
                cookTime: 5, // Hazırlanmış sayılsın
                state: 'prepared',
                bonus: combination.bonus,
                heatLevel: 'fixed'
            };
            
            // Tezgâhı temizle ve yeni item ekle
            this.stations.prep[0] = combinedItem;
            this.stations.prep[1] = null;
            
            // Render et
            this.renderSlot('prep', 0);
            this.renderSlot('prep', 1);
            
            game.ui.showNotification(`✨ ${combination.name} oluşturuldu! +%${Math.round((combination.bonus - 1) * 100)} bonus`, 'success');
        }
    }
    
    moveItem(fromStationType, fromSlotIndex, toStationType, toSlotIndex) {
        // Hedef slot dolu mu kontrol et
        if (this.stations[toStationType][toSlotIndex]) {
            game.ui.showNotification('❌ Hedef slot dolu!', 'error');
            return false;
        }
        
        const item = this.stations[fromStationType][fromSlotIndex];
        if (!item) return false;
        
        // Eğer pişirme durumundan başka bir yere taşınıyorsa, pişirme durumunu sıfırla
        if (fromStationType !== 'prep' && toStationType === 'prep') {
            item.cookTime = 0;
            item.state = 'raw';
            item.startTime = Date.now();
        } else if (toStationType !== 'prep') {
            // Yeni pişirme istasyonuna taşınıyorsa
            item.startTime = Date.now();
            item.cookTime = 0;
            item.heatLevel = toStationType === 'grill' ? 'medium' : 'fixed';
        }
        
        // Taşı
        this.stations[toStationType][toSlotIndex] = item;
        this.stations[fromStationType][fromSlotIndex] = null;
        
        // Render et
        this.renderSlot(fromStationType, fromSlotIndex);
        this.renderSlot(toStationType, toSlotIndex);
        
        game.ui.showNotification(`${item.name} taşındı`, 'success');
        return true;
    }
    
    renderSlot(stationType, slotIndex) {
        const slotId = `${stationType}-${slotIndex}`;
        const slotEl = document.getElementById(slotId);
        if (!slotEl) return;
        
        const item = this.stations[stationType][slotIndex];
        
        if (!item) {
            // Slot tamamen temizle - Tüm state class'larını kaldır
            slotEl.className = `slot ${stationType}-slot`; // Sadece temel class'ları bırak
            slotEl.draggable = false;
            slotEl.style.backgroundColor = ''; // Arka plan rengini temizle
            slotEl.style.background = ''; // Gradient'i de temizle
            
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
            
            // Event listener'ları yenile - BOŞKEN DE DROP EDİLEBİLİR OLMALI
            this.setupSlotEventListeners(slotEl);
        } else {
            slotEl.classList.add('occupied');
            slotEl.draggable = true; // Slot içeriği sürüklenebilir yap
            
            const progress = this.getItemProgress(item);
            const progressClass = progress > 90 ? 'danger' : progress > 70 ? 'warning' : '';
            
            let content = `
                <div class="slot-content">
                    <span style="font-size: 1.5em">${item.icon}</span>
                    <span style="font-size: 0.8em">${item.name}</span>
                    <span style="font-size: 0.7em">${item.state}</span>
                    <button class="trash-btn" onclick="trashItem('${stationType}', ${slotIndex})" title="Çöpe At">🗑️</button>
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
            
            // Event listener'ları yenile + slot drag events ekle
            const refreshedSlot = this.setupSlotEventListeners(slotEl);
            
            // Slot drag events
            refreshedSlot.addEventListener('dragstart', (e) => {
                console.log('Slot drag started:', stationType, slotIndex);
                e.dataTransfer.setData('text/plain', `slot:${stationType}:${slotIndex}`);
                e.dataTransfer.effectAllowed = 'move';
                refreshedSlot.classList.add('dragging');
            });
            
            refreshedSlot.addEventListener('dragend', (e) => {
                console.log('Slot drag ended');
                refreshedSlot.classList.remove('dragging');
            });
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
                    const bonusMultiplier = item.bonus || 1.0; // Kombinasyon bonusu
                    item.cookTime = elapsed * heatMultiplier * bonusMultiplier;
                    
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
                if (item) {
                    // Tüm item'ları al (durum fark etmez - servis sırasında kontrol edilir)
                    items.push(item);
                    console.log(`Available item: ${item.name} (${item.state}) from ${stationType}`);
                }
            });
        });
        return items;
    }
    
    clearPreparedItems() {
        Object.entries(this.stations).forEach(([stationType, slots]) => {
            slots.forEach((item, slotIndex) => {
                if (item) {
                    // Tüm item'ları temizle (durum fark etmez)
                    this.stations[stationType][slotIndex] = null;
                    this.renderSlot(stationType, slotIndex);
                    console.log(`Cleared ${stationType} slot ${slotIndex}: ${item.name}`);
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
        
        // Marine malzeme normalize sistemi
        const normalize = (id) => ({
            'marine_kiyma': 'kiyma',
            'marine_tavuk': 'tavuk',
            'marine_doner': 'doner',
            'marine_kofte': 'kofte',
            'soslu_sucuk': 'sucuk',
            'ozel_hamur': 'hamur',
            'peynirli_hamur': 'pide_hamur',
            'sarmisakli_ekmek': 'ekmek',
            'salata': 'domates',
            'yesil_salata': 'marul',
            'peynirli_salata': 'marul',
            'ozel_sos': 'mayonez',
            'ates_sos': 'aci_sos'
        }[id] || id);
        
        // Sadece gerekli malzemeleri topla
        const usedItems = [];
        const pool = [...preparedItems];
        
        for (const [ingredient, required] of Object.entries(requiredIngredients)) {
            for (let i = 0; i < required; i++) {
                const itemIndex = pool.findIndex(item => normalize(item.type) === ingredient);
                if (itemIndex === -1) {
                    return {
                        success: false,
                        message: `Eksik malzeme: ${game.inventory.getIngredient(ingredient)?.name || ingredient}`,
                        payment: 0
                    };
                }
                usedItems.push(pool.splice(itemIndex, 1)[0]);
            }
        }
        
        // Sadece kullanılan malzemeler için kontrollerFINAL
        // 1. Yanmış kontrolü
        if (usedItems.some(item => item.state === 'burnt')) {
            return {
                success: false,
                message: 'Malzemeler yanmış!',
                payment: 0
            };
        }
        
        // 2. Pişmiş olma kontrolü
        if (usedItems.some(item => !['done', 'ready', 'prepared'].includes(item.state))) {
            return {
                success: false,
                message: 'Malzemeler tam pişmemiş!',
                payment: 0
            };
        }
        
        // Başarılı servis - Sadece kullanılan malzemeleri temizle
        usedItems.forEach(usedItem => {
            for (const [stationType, slots] of Object.entries(game.cooking.stations)) {
                const slotIndex = slots.findIndex(slotItem => slotItem === usedItem);
                if (slotIndex !== -1) {
                    slots[slotIndex] = null;
                    game.cooking.renderSlot(stationType, slotIndex);
                    break;
                }
            }
        });
        
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
        
        const content = document.getElementById('recipe-modal-content');
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

// UI Toggle Functions
function toggleInventory() {
    const content = document.getElementById('inventory-content');
    const toggle = document.getElementById('inventory-toggle');
    
    content.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
    
    console.log('Inventory toggled:', content.classList.contains('collapsed') ? 'closed' : 'open');
}

function toggleCombinations() {
    console.log('toggleCombinations called');
    const content = document.getElementById('combination-content');
    const toggle = document.getElementById('combination-toggle');
    
    if (!content || !toggle) {
        console.error('Combination elements not found:', { content, toggle });
        return;
    }
    
    content.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
    
    console.log('Combinations toggled:', content.classList.contains('collapsed') ? 'closed' : 'open');
    console.log('Content classes:', content.className);
    console.log('Toggle classes:', toggle.className);
}

function toggleRecipeReference() {
    const content = document.getElementById('recipe-content');
    const toggle = document.getElementById('recipe-toggle');
    
    content.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
    
    console.log('Recipe reference toggled:', content.classList.contains('collapsed') ? 'closed' : 'open');
}

// Trash Item Function
function trashItem(stationType, slotIndex) {
    console.log(`Trashing item from ${stationType}:${slotIndex}`);
    
    const item = game.cooking.stations[stationType][slotIndex];
    if (!item) {
        game.ui.showNotification('❌ Slot zaten boş!', 'error');
        return;
    }
    
    // Confirm dialog
    const confirmTrash = confirm(`${item.name} çöpe atılsın mı?\n\nBu işlem geri alınamaz!`);
    if (!confirmTrash) {
        return;
    }
    
    // Clear the slot
    game.cooking.stations[stationType][slotIndex] = null;
    game.cooking.renderSlot(stationType, slotIndex);
    
    game.ui.showNotification(`🗑️ ${item.name} çöpe atıldı`, 'info');
    console.log(`Trashed: ${item.name} from ${stationType}:${slotIndex}`);
}

// Make functions globally accessible
window.toggleInventory = toggleInventory;
window.toggleCombinations = toggleCombinations;
window.toggleRecipeReference = toggleRecipeReference;
window.trashItem = trashItem;

// Initialize Game
const game = new GameManager();
