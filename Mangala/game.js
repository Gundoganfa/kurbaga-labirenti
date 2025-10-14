/**
 * MANGALA / KALAH - İki Kurallı Sürüm
 * ruleset: "kalah" | "turk"
 * - kalah: 14 slot (6/13 store), capture: own-empty -> opposite + own store, extra turn at own store
 * - turk : 12 slot (no store), capture: opponent pit becomes even -> capture to player's treasury, no extra turn
 */

class MangalaGame {
    constructor(options = {}) {
      // === Oyun kuralı seçimi ===
      this.ruleset = options.ruleset === 'turk' ? 'turk' : 'kalah'; // "kalah" | "turk"
  
      // === Tahta ve skor ===
      this.resetStateByRuleset();
  
      // === UI state ===
      this.isAnimating = false;
      this.selectedStone = options.selectedStone || '💖';
      this.turkStartFromOrigin = true; // Türk modunda ilk taşı aldığın kuyuya bırak
  
      // === Başlat ===
      this.cacheDom();
      this.setupEventListeners();
      this.setupStoneSelectors();
      this.bindModeButtons();
      this.syncModeVisibility();
      this.updateDisplay();
      this.updatePlayerTurn();
      this.updateBackgroundTheme();
      
      // Başlangıçta doğru kuralları ve help'i göster
      this.updateModeVisibility();
    }
  
    // Kurala göre başlangıç state
    resetStateByRuleset() {
      if (this.ruleset === 'kalah') {
        // [0..5]=P1 pits, 6=P1 store, [7..12]=P2 pits, 13=P2 store
        this.board = [4,4,4,4,4,4, 0, 4,4,4,4,4,4, 0];
        this.player1Score = null; // store üzerinden okunacak
        this.player2Score = null;
      } else {
        // türk: 12 pit halka, store yok
        this.board = [4,4,4,4,4,4, 4,4,4,4,4,4];
        this.player1Score = 0; // hane/treasure
        this.player2Score = 0;
      }
      this.currentPlayer = 1;
      this.gameOver = false;
      this.winner = null;
    }
  
    cacheDom() {
      // Sık kullanılan elemanları cachele; yoksa null kalsın, kontrolle kullanacağız
      this.$pits = Array.from(document.querySelectorAll('.pit'));
      this.$playerTurn = document.getElementById('currentPlayerDisplay');
      this.$kalah1 = document.getElementById('kalah1');
      this.$kalah2 = document.getElementById('kalah2');
      this.$p1Score = document.getElementById('player1Score');
      this.$p2Score = document.getElementById('player2Score');
      this.$gameOverModal = document.getElementById('gameOverModal');
      this.$winnerIcon = document.getElementById('winnerIcon');
      this.$winnerText = document.getElementById('winnerText');
      this.$finalScores = document.getElementById('finalScores');

      // yeni referanslar:
      this.$boardKalah = document.getElementById('boardKalah');
      this.$boardTurk  = document.getElementById('boardTurk');
      this.$rulesKalah = document.getElementById('rulesKalah');
      this.$rulesTurk  = document.getElementById('rulesTurk');
      this.$helpKalah  = document.getElementById('helpKalah');
      this.$helpTurk   = document.getElementById('helpTurk');
      this.$modeBtns   = Array.from(document.querySelectorAll('.mode-selector'));
    }
  
    setupEventListeners() {
      // Çukurlar
      this.$pits.forEach(pit => {
        pit.addEventListener('click', (e) => {
          const pitIndex = parseInt(e.currentTarget.dataset.pit, 10);
          this.makeMove(pitIndex);
        });
      });
  
      // Butonlar (opsiyonel olarak yoksa hata vermesin)
      document.getElementById('resetBtn')?.addEventListener('click', () => this.resetGame());
      document.getElementById('newGameBtn')?.addEventListener('click', () => this.resetGame());
      document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());
      document.getElementById('closeHelp')?.addEventListener('click', () => this.hideHelp());
      document.getElementById('homeBtn')?.addEventListener('click', () => this.goHome());
  
      // Modallar
      document.getElementById('helpModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.hideHelp();
      });
      this.$gameOverModal?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.hideGameOverModal();
      });
  
      // Mod değiştirme (istersen index’te select koyarsın: #modeSelect)
      document.getElementById('modeSelect')?.addEventListener('change', (e) => {
        const val = e.target.value;
        this.ruleset = (val === 'turk') ? 'turk' : 'kalah';
        this.resetStateByRuleset();
        this.syncModeVisibility();
        this.updateDisplay();
        this.updatePlayerTurn();
        this.showMessage(`Mod: ${this.ruleset === 'kalah' ? 'Kalah' : 'Türk Mangala'}`, 'info');
      });
    }
  
    // --- mod butonlarını bağla ---
    bindModeButtons() {
      if (!this.$modeBtns?.length) return;

      const styleActive = (btn, active) => {
        if (active) {
          btn.classList.add('active','bg-white/20','border-2','border-white/50','text-white');
          btn.classList.remove('bg-white/10','border','border-white/30','text-white/80');
        } else {
          btn.classList.remove('active','bg-white/20','border-2','border-white/50','text-white');
          btn.classList.add('bg-white/10','border','border-white/30','text-white/80');
        }
      };

      this.$modeBtns.forEach(btn => {
        styleActive(btn, btn.dataset.mode === this.ruleset);
        btn.addEventListener('click', () => {
          const nextMode = (btn.dataset.mode === 'turk') ? 'turk' : 'kalah';
          if (this.ruleset === nextMode || this.isAnimating) return;

          // görsel buton durumu
          this.$modeBtns.forEach(b => styleActive(b, b === btn));

          // mod değiştir
          this.ruleset = nextMode;
          this.resetStateByRuleset();
          this.updateBackgroundTheme();
          this.updateModeVisibility(); // board, rules, help toggle
          this.syncModeVisibility();   // (kasa görünürlüğü vs.)
          this.updatePlayerTurn();
          this.updateDisplay();
          this.showMessage(this.ruleset === 'kalah' ? 'Mod: Kalah' : 'Mod: Türk Mangala', 'info');
        });
      });
    }

    // --- arka plan sınıfı ---
    updateBackgroundTheme() {
      const body = document.getElementById('gameBody') || document.body;
      body.classList.toggle('kalah-mode', this.ruleset === 'kalah');
      body.classList.toggle('turk-mode',  this.ruleset === 'turk');
    }

    // --- board/rules/help görünürlüğü ---
    updateModeVisibility() {
      // Board toggle
      if (this.$boardKalah) this.$boardKalah.classList.toggle('hidden', this.ruleset !== 'kalah');
      if (this.$boardTurk)  this.$boardTurk.classList.toggle('hidden',  this.ruleset !== 'turk');

      // Rules toggle
      if (this.$rulesKalah) this.$rulesKalah.classList.toggle('hidden', this.ruleset !== 'kalah');
      if (this.$rulesTurk)  this.$rulesTurk.classList.toggle('hidden',  this.ruleset !== 'turk');

      // Help toggle
      if (this.$helpKalah) this.$helpKalah.classList.toggle('hidden', this.ruleset !== 'kalah');
      if (this.$helpTurk)  this.$helpTurk.classList.toggle('hidden',  this.ruleset !== 'turk');
    }

    setupStoneSelectors() {
      document.querySelectorAll('.stone-selector').forEach(selector => {
        selector.addEventListener('click', () => {
          document.querySelectorAll('.stone-selector').forEach(s => {
            s.classList.remove('active');
            s.classList.add('border-2', 'border-gray-300');
            s.classList.remove('border-3', 'border-purple-500');
            const t = s.querySelector('.text-xs');
            if (t) { t.classList.remove('text-purple-600'); t.classList.add('text-gray-600'); }
          });
  
          selector.classList.add('active');
          selector.classList.remove('border-2', 'border-gray-300');
          selector.classList.add('border-3', 'border-purple-500');
          const textElement = selector.querySelector('.text-xs');
          if (textElement) {
            textElement.classList.add('text-purple-600');
            textElement.classList.remove('text-gray-600');
          }
  
          this.selectedStone = selector.dataset.stone;
          this.updateDisplay();
          const stoneName = textElement ? textElement.textContent : 'Taş';
          this.showMessage(`🎨 ${stoneName} seçildi!`, 'success');
        });
      });
    }
  
    // Mod’a göre UI görünürlüğü (varsa)
    syncModeVisibility() {
      // Kalah store göstergeleri varsa Kalah’ta göster, Türk’te gizle
      [this.$kalah1?.parentElement, this.$kalah2?.parentElement].forEach(el => {
        if (!el) return;
        if (this.ruleset === 'kalah') el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
  
      // Puan alanları her modda aktif (farklı anlamda dolduracağız)
    }
  
    // === Oyuncu hamlesi ===
    async makeMove(pitIndex) {
      if (this.gameOver || this.isAnimating) return;
  
      // Geçerli pit mi ve kendi tarafı mı?
      if (!this.isValidMove(pitIndex)) {
        this.showMessage('Geçersiz hamle! Kendi çukurlarından oynayabilirsin.', 'error');
        return;
      }
      if (this.board[pitIndex] === 0) {
        this.showMessage('Bu çukur boş, başka bir çukur seç.', 'error');
        return;
      }
  
      this.isAnimating = true;
  
      // Taşları al
      let stones = this.board[pitIndex];
      this.board[pitIndex] = 0;
      let currentPit = pitIndex;
  
      // Dağıt
      const finalPit = await this.animateDistribution(currentPit, stones);
  
      // Kural: Kalah modu -> son taş own store ise extra turn
      let extraTurn = false;
      if (this.ruleset === 'kalah' && this.isOwnKalah(finalPit, this.currentPlayer)) {
        extraTurn = true;
        this.showMessage('🎉 Extra tur!', 'success');
      }
  
      // Kalah capture (own empty -> opposite)
      if (this.ruleset === 'kalah' && this.canCaptureKalah(finalPit)) {
        this.captureKalah(finalPit);
      }
  
      // Oyun bitiş kontrolü
      if (this.checkGameEnd()) {
        this.endGame();
        this.isAnimating = false;
        return;
      }
  
      // Sıra değişimi
      if (!extraTurn) {
        this.currentPlayer = (this.currentPlayer === 1) ? 2 : 1;
        this.updatePlayerTurn();
      }
  
      this.updateDisplay();
      this.isAnimating = false;
    }
  
    // === Dağıtım ===
    async animateDistribution(startPit, stones) {
      let currentPit = startPit;

      for (let i = 0; i < stones; i++) {
        // --- İLERLEME KURALI ---
        if (this.ruleset === 'turk' && this.turkStartFromOrigin && i === 0) {
          // İlk taş: aynı kuyuda kal (self-sow)
        } else {
          currentPit = (currentPit + 1) % this.ringSize();
          // Kalah'ta rakip kasayı atla
          if (this.ruleset === 'kalah' && this.isOpponentKalah(currentPit, this.currentPlayer)) {
            currentPit = (currentPit + 1) % this.ringSize();
          }
        }

        this.board[currentPit]++;

        // Türk Mangala: SON taşta çift olduysa rakip çukuru topla
        if (this.ruleset === 'turk' && i === stones - 1) {
          this.checkOpponentEvenCaptureTurk(currentPit);
        }

        this.updateDisplay();
        await this.sleep(300);
      }
      return currentPit;
    }
  
    ringSize() {
      return (this.ruleset === 'kalah') ? 14 : 12;
    }
  
    isValidMove(pitIndex) {
      if (this.ruleset === 'kalah') {
        if (this.currentPlayer === 1) return pitIndex >= 0 && pitIndex <= 5;
        return pitIndex >= 7 && pitIndex <= 12;
      } else {
        // türk: P1: 0..5, P2: 6..11
        if (this.currentPlayer === 1) return pitIndex >= 0 && pitIndex <= 5;
        return pitIndex >= 6 && pitIndex <= 11;
      }
    }
  
    isOwnKalah(pitIndex, player) {
      if (this.ruleset !== 'kalah') return false;
      return (player === 1 && pitIndex === 6) || (player === 2 && pitIndex === 13);
    }
  
    isOpponentKalah(pitIndex, player) {
      if (this.ruleset !== 'kalah') return false;
      return (player === 1 && pitIndex === 13) || (player === 2 && pitIndex === 6);
    }
  
    // === Kalah Capture: own empty -> opposite + own store ===
    canCaptureKalah(finalPit) {
      // son taş kendi boş çukuruna düştüyse ve karşısında taş varsa
      if (this.isOwnKalah(finalPit, this.currentPlayer)) return false; // store değil
      if (this.board[finalPit] !== 1) return false;
  
      const isOwnPit =
        (this.currentPlayer === 1 && finalPit >= 0 && finalPit <= 5) ||
        (this.currentPlayer === 2 && finalPit >= 7 && finalPit <= 12);
  
      if (!isOwnPit) return false;
  
      const opposite = 12 - finalPit;
      return this.board[opposite] > 0;
    }
  
    captureKalah(finalPit) {
      const opposite = 12 - finalPit;
      const captured = this.board[finalPit] + this.board[opposite];
      this.board[finalPit] = 0;
      this.board[opposite] = 0;
      const store = (this.currentPlayer === 1) ? 6 : 13;
      this.board[store] += captured;
      this.showMessage(`🎯 ${captured} taş yakaladın!`, 'success');
    }
  
    // === Türk Mangala Capture: Son taş rakip çukura düştü ve orası ÇİFT olduysa -> tümünü hanene al ===
    checkOpponentEvenCaptureTurk(pitIndex) {
      if (this.ruleset !== 'turk') return;
  
      const isOpponentPit =
        (this.currentPlayer === 1 && pitIndex >= 6 && pitIndex <= 11) ||
        (this.currentPlayer === 2 && pitIndex >= 0 && pitIndex <= 5);
  
      if (!isOpponentPit) return;
  
      const stonesInPit = this.board[pitIndex];
      if (stonesInPit > 0 && stonesInPit % 2 === 0) {
        const captured = this.board[pitIndex];
        this.board[pitIndex] = 0;
        if (this.currentPlayer === 1) this.player1Score += captured;
        else this.player2Score += captured;
        this.showMessage(`⚡ Rakip çukurdan ${captured} taş aldın!`, 'success');
      }
    }
  
    // === Bitiş Kontrolü ===
    checkGameEnd() {
      if (this.ruleset === 'kalah') {
        const p1Empty = this.board.slice(0, 6).every(v => v === 0);
        const p2Empty = this.board.slice(7, 13).every(v => v === 0);
        return p1Empty || p2Empty;
      } else {
        const p1Empty = this.board.slice(0, 6).every(v => v === 0);
        const p2Empty = this.board.slice(6, 12).every(v => v === 0);
        return p1Empty || p2Empty;
      }
    }
  
    endGame() {
      this.gameOver = true;
  
      if (this.ruleset === 'kalah') {
        // Kalanları store’lara süpür
        for (let i = 0; i < 6; i++) {
          this.board[6] += this.board[i];
          this.board[i] = 0;
        }
        for (let i = 7; i < 13; i++) {
          this.board[13] += this.board[i];
          this.board[i] = 0;
        }
        const p1 = this.board[6], p2 = this.board[13];
        this.winner = p1 === p2 ? 0 : (p1 > p2 ? 1 : 2);
      } else {
        // Türk: kalan taşlar sahiplerine gider
        const p1Remain = this.board.slice(0,6).reduce((a,b)=>a+b,0);
        const p2Remain = this.board.slice(6,12).reduce((a,b)=>a+b,0);
        this.player1Score += p1Remain;
        this.player2Score += p2Remain;
        for (let i=0;i<12;i++) this.board[i]=0;
  
        const p1 = this.player1Score, p2 = this.player2Score;
        this.winner = p1 === p2 ? 0 : (p1 > p2 ? 1 : 2);
      }
  
      this.updateDisplay();
      setTimeout(() => this.showGameOverModal(), 600);
    }
  
    // === Görünüm ===
    updateDisplay() {
      // PİTLER
      this.$pits.forEach(pit => {
        const idx = parseInt(pit.dataset.pit, 10);
        const count = (idx < this.board.length) ? this.board[idx] : 0;
  
        const $count = pit.querySelector('.pit-count');
        if ($count) {
          if (count === 0) {
            $count.textContent = '💤';
            pit.classList.add('opacity-50');
          } else {
            pit.classList.remove('opacity-50');
            // Seçilen taşla görsel
            try {
              $count.textContent = this.selectedStone.repeat(count);
            } catch {
              $count.textContent = String(count);
            }
          }
        }
      });
  
      // STORE / SKOR
      if (this.ruleset === 'kalah') {
        this.$kalah1 && (this.$kalah1.textContent = this.board[6]);
        this.$kalah2 && (this.$kalah2.textContent = this.board[13]);
        // Ekrandaki skor göstergeleri varsa store değerini yaz
        this.$p1Score && (this.$p1Score.textContent = this.board[6]);
        this.$p2Score && (this.$p2Score.textContent = this.board[13]);
      } else {
        // Türk: store yok; oyuncu skorlarını yaz
        this.$kalah1 && (this.$kalah1.textContent = '-');
        this.$kalah2 && (this.$kalah2.textContent = '-');
        this.$p1Score && (this.$p1Score.textContent = this.player1Score);
        this.$p2Score && (this.$p2Score.textContent = this.player2Score);
      }
  
      this.highlightPlayerPits();
    }
  
    highlightPlayerPits() {
      this.$pits.forEach(pit => {
        const idx = parseInt(pit.dataset.pit, 10);
        pit.classList.remove('ring-4', 'ring-red-400', 'ring-blue-400');
  
        if (this.gameOver) return;
  
        if (this.ruleset === 'kalah') {
          if (this.currentPlayer === 1 && idx >= 0 && idx <= 5) {
            pit.classList.add('ring-4', 'ring-red-400');
          } else if (this.currentPlayer === 2 && idx >= 7 && idx <= 12) {
            pit.classList.add('ring-4', 'ring-blue-400');
          }
        } else {
          if (this.currentPlayer === 1 && idx >= 0 && idx <= 5) {
            pit.classList.add('ring-4', 'ring-red-400');
          } else if (this.currentPlayer === 2 && idx >= 6 && idx <= 11) {
            pit.classList.add('ring-4', 'ring-blue-400');
          }
        }
      });
    }
  
    updatePlayerTurn() {
      if (!this.$playerTurn) return;
      if (this.currentPlayer === 1) {
        this.$playerTurn.textContent = "🔴 Oyuncu 1'in Sırası";
        this.$playerTurn.className = 'text-xl font-bold text-red-600 mb-2';
      } else {
        this.$playerTurn.textContent = '🔵 Oyuncu 2’nin Sırası';
        this.$playerTurn.className = 'text-xl font-bold text-blue-600 mb-2';
      }
    }
  
    showMessage(message, type = 'info') {
      const colors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500'
      };
      const div = document.createElement('div');
      div.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all`;
      div.textContent = message;
      document.body.appendChild(div);
      setTimeout(() => {
        div.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => div.remove(), 300);
      }, 1800);
    }
  
    showGameOverModal() {
      if (!this.$gameOverModal) return;
      if (this.winner === 0) {
        this.$winnerIcon && (this.$winnerIcon.textContent = '🤝');
        this.$winnerText && (this.$winnerText.textContent = 'Berabere!');
      } else {
        this.$winnerIcon && (this.$winnerIcon.textContent = '🏆');
        this.$winnerText && (this.$winnerText.textContent = `Oyuncu ${this.winner} kazandı!`);
      }
  
      let p1, p2;
      if (this.ruleset === 'kalah') {
        p1 = this.board[6]; p2 = this.board[13];
      } else {
        p1 = this.player1Score; p2 = this.player2Score;
      }
      if (this.$finalScores) {
        this.$finalScores.innerHTML = `
          <div class="flex justify-between items-center">
            <span class="text-red-600">🔴 Oyuncu 1: ${p1} taş</span>
            <span class="text-blue-600">🔵 Oyuncu 2: ${p2} taş</span>
          </div>`;
      }
      this.$gameOverModal.classList.remove('hidden');
    }
  
    hideGameOverModal() {
      this.$gameOverModal?.classList.add('hidden');
    }
  
    showHelp() {
      document.getElementById('helpModal')?.classList.remove('hidden');
    }
    hideHelp() {
      document.getElementById('helpModal')?.classList.add('hidden');
    }
  
    resetGame() {
      this.resetStateByRuleset();
      this.hideGameOverModal();
      this.updateDisplay();
      this.updatePlayerTurn();
      this.showMessage('🎮 Yeni oyun!', 'info');
    }
  
    goHome() {
      window.location.href = '../index.html';
    }
  
    ringSize() {
      return this.ruleset === 'kalah' ? 14 : 12;
    }

    checkOpponentEvenCaptureTurk(currentPit) {
      // Bu rakip çukuru mu?
      const isOpponentPit = (this.currentPlayer === 1 && currentPit >= 6 && currentPit <= 11) ||
                           (this.currentPlayer === 2 && currentPit >= 0 && currentPit <= 5);
      
      if (!isOpponentPit) return;
      
      const stonesInPit = this.board[currentPit];
      
      // Çift sayıya döndü mü? (ve 0'dan büyük)
      if (stonesInPit > 0 && stonesInPit % 2 === 0) {
          // Bu çukurdaki tüm taşları yakala
          const capturedStones = this.board[currentPit];
          this.board[currentPit] = 0;
          
          // Türk Mangala'da kasa yok, puana ekle
          if (this.currentPlayer === 1) {
              this.turkScore1 = (this.turkScore1 || 0) + capturedStones;
          } else {
              this.turkScore2 = (this.turkScore2 || 0) + capturedStones;
          }
          
          this.showMessage(`⚡ Rakip çukurdan ${capturedStones} taş yakaladınız!`, 'success');
      }
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  }
  
  // Başlat
  document.addEventListener('DOMContentLoaded', () => {
    // İstersen index’te global konfig: <body data-ruleset="turk"> gibi
    const dataRuleset = document.body?.dataset?.ruleset;
    const ruleset = (dataRuleset === 'turk' || dataRuleset === 'kalah') ? dataRuleset : 'kalah';
    window.mangalaGame = new MangalaGame({ ruleset });
  });
  