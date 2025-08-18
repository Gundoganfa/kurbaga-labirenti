/* Math Dash – Add & Run
   Plain JS. Single file modules via IIFE. Mobile-first, offline-ready.
   Sections: utils/state, audio, storage, math, scene/physics, pooling, UI, loop.
*/
(function(){
  'use strict';

  // ===== Utils & Global State =====
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const randInt = (min,max)=>Math.floor(Math.random()*(max-min+1))+min; // inclusive
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const formatTime = (sec)=>{
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s/60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2,'0')}`;
  };

  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));

  const S = {
    livesMax: 3,
    lives: 3,
    score: 0,
    best: 0,
    speed: 2.4,          // world units/sec (arbitrary)
    baseSpeed: 2.4,
    speedDelta: 0.55,    // on correct
    speedSoftCap: 9.0,
    friction: 0.997,     // per frame damp (gentler decay)
    wrongSlow: 0.90,     // multiplier on wrong (less slowdown)
    streak: 0,
    turboActive: false,
    turboTime: 0,
    turboDur: 5.0,
    turboSpeedBoost: 2.5, // additive to speed while active
    turboScoreMult: 2,
    running: false,
    paused: false,
    muted: false,
    interacted: false,   // audio unlock
    problemElapsed: 0,   // seconds since current problem shown
    problemOp: '+',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dt: 0,
    t: 0,
    lastTime: 0,
  };

  // Persisted settings
  const STORAGE_KEYS = { best:'md_addrun_best', muted:'md_addrun_muted' };
  try{
    const b = localStorage.getItem(STORAGE_KEYS.best);
    if(b) S.best = parseInt(b,10)||0;
    const m = localStorage.getItem(STORAGE_KEYS.muted);
    if(m) S.muted = m === '1';
  }catch{ /* ignore */ }

  // ===== Audio (simple WebAudio beeps) =====
  const AudioMod = (()=>{
    const ctx = new (window.AudioContext||window.webkitAudioContext||function(){})();
    let enabled = !S.muted;
    const safe = ()=>ctx && ctx.state !== 'closed' && S.interacted && enabled;
    const now = ()=>ctx.currentTime||0;

    function play(freq=440, dur=0.08, type='sine', vol=0.08){
      if(!safe()) return;
      const t = now();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol; g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+dur);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(t+dur+0.02);
    }

    return {
      unlock: ()=>{ if(ctx && ctx.state === 'suspended') ctx.resume(); S.interacted = true; },
      setMuted: (m)=>{ enabled = !m; },
      tap: ()=>play(600, .035, 'square', 0.05),
      correct: ()=>{ play(660,.06,'triangle',.07); setTimeout(()=>play(880,.08,'triangle',.06),30); },
      wrong: ()=>{ play(180,.12,'sawtooth',.08); },
      turbo: ()=>{ play(520,.05,'sine',.06); setTimeout(()=>play(780,.08,'sine',.05),40); },
      pickup: ()=>{ play(840,.04,'sine',.045); },
    };
  })();

  // ===== Math Generator with progression =====
  const MathGen = (()=>{
    let maxRange = 9;           // start with one-digit
    let correctStreakForRange = 0;

    function nextOp(){
      if(maxRange >= 20){
        return Math.random() < 0.3 ? '-' : '+'; // bias to addition
      }
      return '+';
    }

    function incDifficulty(){
      correctStreakForRange++;
      if(correctStreakForRange >= 4){ // every 4 correct expand bounds
        correctStreakForRange = 0;
        if(maxRange < 19) maxRange = 19;
        else if(maxRange < 29) maxRange = 29;
        else if(maxRange < 49) maxRange = 49;
        else if(maxRange < 99) maxRange += 20; // grow slowly
      }
    }

    function generate(){
      const op = nextOp();
      let a,b,ans;
      if(op === '+'){
        a = randInt(0, maxRange);
        b = randInt(0, maxRange);
        ans = a + b;
      }else{
        // ensure non-negative result
        a = randInt(0, maxRange);
        b = randInt(0, Math.min(a, maxRange));
        ans = a - b;
      }
      const txt = `${a} ${op} ${b} = ?`;
      const answers = makeOptions(a,b,op,ans);
      return {a,b,op,ans, txt, answers};
    }

    function makeOptions(a,b,op,ans){
      const opts = new Set([ans]);
      // plausible distractors
      const candidates = [
        ans+1, ans-1,
        op==='+' ? a+b+2 : a-b-2,
        op==='+' ? a+b-2 : a-b+2,
        a + (op==='+'? (b-1):(b+1)),
        (op==='+'? Math.abs(a-b) : a+b),
        a+randInt(-3,3), b+randInt(-3,3), ans+randInt(-3,3)
      ];
      for(const c of candidates){
        if(Number.isFinite(c) && c>=0) opts.add(c);
        if(opts.size>=7) break;
      }
      // ensure 4 total
      while(opts.size<4){ opts.add(ans+randInt(-5,5)); }
      const arr = Array.from(opts).slice(0,8).filter(n=>Number.isFinite(n));
      // pick 4 including ans
      if(!arr.includes(ans)) arr[0]=ans;
      // shuffle and trim to 4
      arr.sort(()=>Math.random()-0.5);
      const pick4 = [];
      // ensure exactly one correct among first four; if multiple, adjust slightly
      for(const v of arr){
        if(pick4.length<4) pick4.push(v);
      }
      // fix duplicates causing multiple corrects
      let correctCount = pick4.filter(v=>v===ans).length;
      for(let i=0;i<pick4.length && correctCount>1;i++){
        if(pick4[i]===ans && i!==pick4.indexOf(ans)){
          pick4[i] = ans + (i%2? 2 : -2);
          correctCount--;
        }
      }
      // ensure ans present
      if(!pick4.includes(ans)) pick4[0] = ans;
      // final shuffle
      pick4.sort(()=>Math.random()-0.5);
      return pick4;
    }

    return { generate, incDifficulty };
  })();

  // ===== Scene & Physics =====
  const canvas = qs('#scene');
  const ctx2d = canvas.getContext('2d');
  let DPR = Math.min(2, window.devicePixelRatio||1);

  const Scene = {
    w: 480, h: 270,
    groundY: 0,
    runner:{ x: 90, y:0, w: 36, h: 56, phase:0 },
    scrollX: 0,
    stars: [],
    pool: [],
    poolSize: 48,
    spawnTimer: 0,
    spawnEvery: 0.65, // seconds baseline (will scale with speed)
  };

  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio||1);
    Scene.w = Math.max(320, Math.floor(rect.width));
    Scene.h = Math.max(200, Math.floor(rect.height));
    canvas.width = Math.floor(Scene.w * DPR);
    canvas.height = Math.floor(Scene.h * DPR);
    ctx2d.setTransform(DPR,0,0,DPR,0,0);
    // ground 18% from bottom
    Scene.groundY = Scene.h - Math.round(Scene.h*0.18);
    Scene.runner.y = Scene.groundY - Scene.runner.h;
  }

  window.addEventListener('resize', resizeCanvas, {passive:true});

  // ===== Star Pooling =====
  function createStar(){
    return { x: Scene.w + randInt(0,80), y: Scene.groundY - 14, r: 8, active: false };
  }
  function initPool(){
    Scene.stars.length = 0; Scene.pool.length = 0;
    for(let i=0;i<Scene.poolSize;i++) Scene.pool.push(createStar());
  }
  function spawnStar(){
    const star = Scene.pool.find(s=>!s.active) || createStar();
    star.x = Scene.w + randInt(0, 60);
    star.y = Scene.groundY - 14;
    star.active = true;
    if(!Scene.stars.includes(star)) Scene.stars.push(star);
  }

  // ===== Rendering =====
  function draw(){
    const w = Scene.w, h = Scene.h;
    const gy = Scene.groundY;
    // sky
    ctx2d.fillStyle = '#0b1329';
    ctx2d.fillRect(0,0,w,h);
    // parallax stars back layer (cheap)
    ctx2d.fillStyle = 'rgba(255,255,255,0.08)';
    for(let i=0;i<16;i++){
      const sx = (i*67 + (Scene.scrollX*0.2))%w; const sy = (i*37)%Math.floor(h*0.6);
      ctx2d.fillRect(sx, sy, 2, 2);
    }

    // ground
    ctx2d.fillStyle = '#0d1a3d';
    ctx2d.fillRect(0, gy, w, h-gy);
    // ground stripes
    const stripeW = 24, stripeH = 6;
    const off = - (Scene.scrollX % stripeW);
    ctx2d.fillStyle = '#13306e';
    for(let x=off; x<w; x+=stripeW){ ctx2d.fillRect(x, gy+10, 16, stripeH); }

    // stars (draw first)
    for(const s of Scene.stars){ if(!s.active) continue; drawStar(s.x,s.y,s.r); }

    // runner (simple body + legs) - draw last to ensure visibility
    const r = Scene.runner;
    // glow
    ctx2d.fillStyle = 'rgba(76,160,255,0.18)';
    ctx2d.beginPath(); ctx2d.ellipse(r.x+r.w*0.5, r.y+r.h, r.w*0.7, 10, 0, 0, Math.PI*2); ctx2d.fill();
    // body
    ctx2d.fillStyle = '#4dd06c';
    ctx2d.fillRect(r.x, r.y, r.w, r.h);
    // outline for visibility
    ctx2d.strokeStyle = '#0b0f1a';
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(r.x+0.5, r.y+0.5, r.w-1, r.h-1);
    // head
    ctx2d.fillStyle = '#d7ffe5';
    const hw = r.w*0.56, hx = r.x + r.w*0.22, hy = r.y-10;
    ctx2d.fillRect(hx, hy, hw, 10);
    ctx2d.strokeRect(hx+0.5, hy+0.5, hw-1, 9);
    // legs swing
    const leg = Math.sin(r.phase)*6;
    ctx2d.fillStyle = '#33a653';
    ctx2d.fillRect(r.x+6, r.y+r.h-10, 8, 10+leg);
    ctx2d.fillRect(r.x+r.w-14, r.y+r.h-10, 8, 10-leg);
  }

  function drawStar(x,y,r){
    // simple 5-point star
    ctx2d.save();
    ctx2d.translate(x,y);
    ctx2d.rotate( ( (x+y+Scene.scrollX) % 360 ) * Math.PI/720 );
    ctx2d.fillStyle = '#ffcc33';
    ctx2d.beginPath();
    const spikes=5, outer=r, inner=r*0.5;
    let rot = Math.PI/2 * 3, cx=0, cy=0;
    ctx2d.moveTo(cx, cy - outer);
    for(let i=0;i<spikes;i++){
      cx = Math.cos(rot)*outer; cy = Math.sin(rot)*outer; ctx2d.lineTo(cx,cy); rot += Math.PI/spikes;
      cx = Math.cos(rot)*inner; cy = Math.sin(rot)*inner; ctx2d.lineTo(cx,cy); rot += Math.PI/spikes;
    }
    ctx2d.lineTo(0, cy - outer);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.restore();
  }

  // ===== Game Logic =====
  const UI = {
    app: qs('#app'),
    start: qs('#startScreen'),
    how: qs('#howtoDetails'),
    game: qs('#game'),
    pause: qs('#pauseOverlay'),
    over: qs('#gameOver'),
    problem: qs('#problemText'),
    hearts: qs('#hearts'),
    score: qs('#score'),
    speed: qs('#speed'),
    streak: qs('#streak'),
    timer: qs('#timer'),
    turboBadge: qs('#turboBadge'),
    answers: qs('#answers'),
    btns: qsa('#answers .answer'),
    btnPlay: qs('#btnPlay'),
    btnHow: qs('#btnHow'),
    btnMuteStart: qs('#btnMuteStart'),
    btnPause: qs('#btnPause'),
    btnMute: qs('#btnMute'),
    btnResume: qs('#btnResume'),
    finalScore: qs('#finalScore'),
    bestScore: qs('#bestScore'),
    btnReplay: qs('#btnReplay'),
    btnHome: qs('#btnHome'),
  };

  function setMuteUI(m){
    UI.btnMuteStart.textContent = m ? '🔇 Sound: Off' : '🔊 Sound: On';
    UI.btnMute.textContent = m ? '🔇' : '🔊';
  }

  function updateHUD(){
    UI.hearts.textContent = '❤️'.repeat(S.lives);
    UI.score.textContent = `⭐ ${S.score}`;
    UI.speed.textContent = `🏃 ${S.speed.toFixed(1)}`;
    UI.streak.textContent = `🔥 ${S.streak}`;
    UI.timer.textContent = `⏱️ ${formatTime(S.timeLeft)}`;
    if(S.turboActive){
      UI.turboBadge.hidden = false;
      // Keep icon-only; update accessible title/label with remaining time
      const tLeft = Math.ceil(S.turboTime);
      UI.turboBadge.title = `Turbo ${tLeft}s`;
      UI.turboBadge.setAttribute('aria-label', `Turbo ${tLeft}s`);
    }else UI.turboBadge.hidden = true;
  }

  // current problem
  let problem = null; // {ans, answers[], txt}

  function newProblem(isAfterCorrect){
    if(isAfterCorrect) MathGen.incDifficulty();
    problem = MathGen.generate();
    S.problemElapsed = 0;
    S.problemOp = problem.op;
    UI.problem.textContent = problem.txt;
    // apply answers to buttons in random order (already shuffled)
    UI.btns.forEach((b,i)=>{
      b.textContent = String(problem.answers[i]);
      b.dataset.value = String(problem.answers[i]);
      b.classList.remove('answer--correct','answer--wrong');
    });
    // subtle transition
    if(!S.reducedMotion){ UI.problem.classList.add('flash'); setTimeout(()=>UI.problem.classList.remove('flash'),220); }
  }

  function onAnswerTap(valBtn, btnEl){
    if(!S.running || S.paused) return;
    AudioMod.tap();
    const val = parseInt(valBtn,10);
    if(val === problem.ans){
      S.streak++;
      S.speed = Math.min(S.speed + S.speedDelta, S.speedSoftCap);
      if(S.streak === 3 && !S.turboActive){ activateTurbo(); }
      btnEl.classList.add('answer--correct');
      if(!S.reducedMotion){ UI.answers.classList.add('flash'); setTimeout(()=>UI.answers.classList.remove('flash'),220); }
      S.correctsSinceLast++;
      AudioMod.correct();
      // reset reduction immediately on answer
      S.problemElapsed = 0;
      newProblem(true);
    }else{
      S.lives = clamp(S.lives-1, 0, S.livesMax);
      S.streak = 0;
      S.speed = Math.max(S.baseSpeed*0.8, S.speed * S.wrongSlow);
      btnEl.classList.add('answer--wrong');
      if(!S.reducedMotion){ UI.answers.classList.add('shake'); setTimeout(()=>UI.answers.classList.remove('shake'),260); }
      AudioMod.wrong();
      // even on wrong, remove spawn reduction penalty immediately
      S.problemElapsed = 0;
      if(S.lives<=0){ gameOver(); return; }
      // keep same problem on wrong
    }
    updateHUD();
  }

  function activateTurbo(){
    S.turboActive = true; S.turboTime = S.turboDur;
    S.speed = Math.min(S.speed + S.turboSpeedBoost, S.speedSoftCap*1.2);
    AudioMod.turbo();
  }

  function endTurbo(){ S.turboActive = false; }

  // ===== Flow =====
  function resetGame(){
    S.lives = S.livesMax; S.score = 0; S.speed = S.baseSpeed; S.streak=0; S.running=true; S.paused=false;
    S.turboActive=false; S.turboTime=0; S.correctsSinceLast=0;
    S.timeLeft = 120; // seconds total
    Scene.scrollX=0; initPool();
    resizeCanvas();
    newProblem(false);
    updateHUD();
  }

  function startGame(){
    UI.start.hidden = true; UI.over.hidden = true; UI.game.hidden = false; UI.pause.hidden = true;
    resetGame();
    // kick off main loop
    S.lastTime = 0;
    requestAnimationFrame(tick);
  }

  function pauseGame(){ if(!S.running) return; S.paused = true; UI.pause.hidden = false; UI.btnPause.setAttribute('aria-pressed','true'); }
  function resumeGame(){ S.paused = false; UI.pause.hidden = true; UI.btnPause.setAttribute('aria-pressed','false'); S.lastTime = performance.now(); requestAnimationFrame(tick); }

  function gameOver(){
    S.running=false;
    try{ if(S.score > S.best){ S.best = S.score; localStorage.setItem(STORAGE_KEYS.best, String(S.best)); } }catch{}
    UI.finalScore.textContent = `Score: ${S.score}`;
    UI.bestScore.textContent = `Best: ${S.best}`;
    UI.over.hidden = false;
  }

  // ===== Input bindings =====
  function bindUI(){
    // Start
    UI.btnPlay.addEventListener('click', ()=>{ AudioMod.unlock(); AudioMod.tap(); startGame(); }, {passive:true});
    UI.btnHow.addEventListener('click', ()=>{ AudioMod.tap(); UI.how.open = !UI.how.open; }, {passive:true});

    // Mute
    const setMuted = (m)=>{ S.muted = m; setMuteUI(m); AudioMod.setMuted(m); try{ localStorage.setItem(STORAGE_KEYS.muted, m?'1':'0'); }catch{} };
    setMuteUI(S.muted); AudioMod.setMuted(S.muted);
    UI.btnMuteStart.addEventListener('click', ()=>{ setMuted(!S.muted); AudioMod.tap(); }, {passive:true});
    UI.btnMute.addEventListener('click', ()=>{ setMuted(!S.muted); AudioMod.tap(); }, {passive:true});

    // Pause/Resume
    UI.btnPause.addEventListener('click', ()=>{ if(!S.running) return; if(S.paused) resumeGame(); else pauseGame(); AudioMod.tap(); }, {passive:true});
    UI.btnResume.addEventListener('click', ()=>{ resumeGame(); AudioMod.tap(); }, {passive:true});

    // Answers
    UI.btns.forEach(btn=>{
      btn.addEventListener('click', (e)=>{ AudioMod.unlock(); onAnswerTap(btn.dataset.value, btn); }, {passive:true});
    });

    // Game Over
    UI.btnReplay.addEventListener('click', ()=>{ AudioMod.tap(); startGame(); }, {passive:true});
    UI.btnHome.addEventListener('click', ()=>{ AudioMod.tap(); UI.game.hidden = true; UI.over.hidden=true; UI.start.hidden=false; }, {passive:true});

    // Prevent iOS double-tap zoom via css viewport + making sure clicks are fast; no extra needed
  }

  // ===== Main Loop =====
  function tick(ts){
    if(!S.running) return;
    if(S.paused){ S.lastTime = ts; requestAnimationFrame(tick); return; }
    if(!S.lastTime) S.lastTime = ts;
    let dt = (ts - S.lastTime)/1000; // seconds
    dt = clamp(dt, 0, 0.05); // cap to avoid huge jumps
    S.lastTime = ts; S.dt = dt; S.t += dt;

    // friction toward base when not turbo
    if(!S.turboActive){
      S.speed = clamp(S.speed * Math.pow(S.friction, 60*dt), S.baseSpeed*0.6, S.speedSoftCap);
    } else {
      S.turboTime -= dt;
      if(S.turboTime <= 0){ endTurbo(); }
    }

    // track problem elapsed
    S.problemElapsed += dt;

    // countdown timer
    if(S.timeLeft > 0){
      S.timeLeft = Math.max(0, S.timeLeft - dt);
      if(S.timeLeft === 0){
        gameOver();
        return;
      }
    }

    // update runner anim
    Scene.runner.phase += S.speed * 0.25;

    // world scroll
    const worldSpeedPx = S.speed * 60; // px/sec mapping
    Scene.scrollX += worldSpeedPx*dt;

    // star spawn rate depends on speed
    let spawnEvery = clamp(Scene.spawnEvery - (S.speed-2.4)*0.035, 0.28, 0.65);
    // If user delays answering, reduce stars notably; after 10s, stop entirely (any operator)
    let allowSpawn = true;
    if(S.problemElapsed >= 10){
      allowSpawn = false; // no stars after 10s of inactivity
    }else if(S.problemElapsed > 5){
      const over = Math.min(S.problemElapsed - 5, 5); // 0..5
      const factor = 1 + (over/5)*3.0; // 1..4x interval (much fewer stars)
      spawnEvery = clamp(spawnEvery * factor, 0.28, 3.5);
    }
    if(allowSpawn){
      Scene.spawnTimer += dt;
      if(Scene.spawnTimer >= spawnEvery){ Scene.spawnTimer = 0; spawnStar(); }
    }else{
      // prevent backlog when spawning resumes on next problem
      Scene.spawnTimer = 0;
    }

    // move stars and collect
    for(const s of Scene.stars){
      if(!s.active) continue;
      s.x -= worldSpeedPx*dt;
      if(s.x < -20){ s.active = false; continue; }
      // collision (AABB approx)
      const r = Scene.runner;
      if(s.x+s.r > r.x && s.x-s.r < r.x+r.w && s.y+s.r > r.y && s.y-s.r < r.y+r.h){
        s.active=false;
        S.score += (S.turboActive ? S.turboScoreMult : 1);
        AudioMod.pickup();
        // light flare feedback by brief flash of scene-wrap via CSS class on parent
        if(!S.reducedMotion){ UI.game.classList.add('flash'); setTimeout(()=>UI.game.classList.remove('flash'),120); }
      }
    }

    draw();
    updateHUD();

    requestAnimationFrame(tick);
  }

  // ===== Init =====
  function init(){
    bindUI();
    resizeCanvas();
    initPool();
  }

  document.addEventListener('visibilitychange', ()=>{ if(document.hidden && S.running){ pauseGame(); } }, {passive:true});
  window.addEventListener('orientationchange', ()=>{ setTimeout(resizeCanvas, 120); }, {passive:true});

  // Kickoff
  init();
})();
