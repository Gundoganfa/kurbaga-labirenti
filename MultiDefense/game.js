/* Multiplication Defense — plain JS, mobile-first, offline-ready
   Modules (IIFE): utils/state, audio, math/waves, pooling, UI, loop
*/
(function(){
  'use strict';

  // ===== Utils & State =====
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const rand = (min,max)=>Math.random()*(max-min)+min;
  const rint = (min,max)=>Math.floor(rand(min,max+1));
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  const qs = s=>document.querySelector(s);
  const qsa = s=>Array.from(document.querySelectorAll(s));

  const STORAGE = { best:'md_multi_best', muted:'md_multi_muted' };

  const S = {
    running:false, paused:false, interacted:false,
    livesMax:3, lives:3,
    score:0, best:0,
    wave:1,
    target:0,
    streak:0,
    turbo:false, turboTime:0, turboDur:5,
    shield:false,
    freezeTime:0,
    time:0, dt:0, last:0,
    intermission:false, interTime:0, interStep:3,
    // spawn/difficulty (evolves with wave)
    factorMax:9, // grows to 20
    enemyBaseSpeed:32, // px/s baseline, grows
    spawnEvery:1.4, // seconds, shrinks
  };

  try{
    const b = localStorage.getItem(STORAGE.best); if(b) S.best = parseInt(b,10)||0;
    const m = localStorage.getItem(STORAGE.muted); if(m) S.muted = m==='1'; else S.muted=false;
  }catch{}

  // ===== Audio (tiny WebAudio beeps) =====
  const AudioMod = (function(){
    const Ctx = window.AudioContext||window.webkitAudioContext;
    const ctx = Ctx ? new Ctx() : null;
    let enabled = !S.muted;
    const ok = ()=>ctx && ctx.state!=='closed' && S.interacted && enabled;
    const now = ()=>ctx?ctx.currentTime:0;
    function tone(freq=440, dur=0.09, type='sine', vol=0.08){ if(!ok()) return; const t=now(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=vol; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(t+dur+0.02); }
    return{
      unlock:()=>{ if(ctx && ctx.state==='suspended') ctx.resume(); S.interacted=true; },
      setMuted:(m)=>{ enabled=!m; },
      tap:()=>tone(600,.035,'square',.05),
      correct:()=>{ tone(700,.05,'triangle',.07); setTimeout(()=>tone(950,.07,'triangle',.06),35); },
      wrong:()=>tone(200,.12,'sawtooth',.085),
      explode:()=>{ tone(520,.05,'square',.07); setTimeout(()=>tone(300,.08,'sawtooth',.06),60); },
      power:()=>tone(840,.05,'sine',.06),
      turbo:()=>{ tone(520,.05,'sine',.06); setTimeout(()=>tone(780,.08,'sine',.05),40); },
    };
  })();

  // ===== Canvas / Field =====
  const canvas = qs('#field');
  const ctx = canvas.getContext('2d');
  let DPR = Math.min(2, window.devicePixelRatio||1);
  const Field = { w:480, h:270, baseX:40 };

  function resize(){
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio||1);
    Field.w = Math.max(320, Math.floor(rect.width));
    Field.h = Math.max(200, Math.floor(rect.height));
    canvas.width = Math.floor(Field.w*DPR);
    canvas.height = Math.floor(Field.h*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true});

  // ===== Pools =====
  const ENEMIES = []; const EPOOL = [];
  const PARTS = []; const PPOOL = [];
  const STARS = []; // power-up drops

  function newEnemy(){ return {x:Field.w+30, y:0, v:40, a:2, b:2, prod:4, runner:false, alive:false}; }
  function getEnemy(){ return EPOOL.pop()||newEnemy(); }
  function releaseEnemy(e){ e.alive=false; EPOOL.push(e); }

  function newPart(){ return {x:0,y:0,vx:0,vy:0,t:0,alive:false}; }
  function getPart(){ return PPOOL.pop()||newPart(); }
  function releasePart(p){ p.alive=false; PPOOL.push(p); }

  function getMaxEnemyX(){
    let maxX = Field.baseX; for(const e of ENEMIES){ if(e.alive && e.x>maxX) maxX=e.x; } return maxX;
  }

  function pickNonOverlappingY(spawnX){
    // Build 4-5 lanes across the vertical play area
    const top = Math.round(Field.h*0.15);
    const bottom = Math.round(Field.h*0.85);
    const lanes = 5;
    const step = Math.max(36, Math.floor((bottom-top)/(lanes-1)));
    const laneYs = Array.from({length:lanes}, (_,i)=> top + i*step);
    // Try multiple candidates to avoid overlap with nearby enemies
    for(let attempt=0; attempt<8; attempt++){
      const y = laneYs[(Math.floor(Math.random()*laneYs.length) + attempt) % laneYs.length];
      let ok = true;
      for(const e of ENEMIES){
        if(!e.alive) continue;
        const closeX = Math.abs(e.x - spawnX) < 90; // near horizontally
        const overlapY = Math.abs(e.y - y) < 56;    // near vertically (approx enemy height)
        if(closeX && overlapY){ ok=false; break; }
      }
      if(ok) return y;
    }
    // Fallback
    return laneYs[Math.floor(Math.random()*laneYs.length)];
  }

  function spawnEnemy(cfg){
    const e = getEnemy();
    e.alive=true;
    e.a = cfg?.a ?? rint(2, S.factorMax);
    e.b = cfg?.b ?? rint(2, S.factorMax);
    e.prod = e.a*e.b;
    e.runner = Math.random()<cfg?.runnerProb || false;
    // choose Y to reduce overlap with nearby enemies
    const boost = e.runner? 1.55 : 1;
    const freezeMul = S.freezeTime>0? 0.45 : 1;
    e.v = (S.enemyBaseSpeed * boost * freezeMul) * rand(0.98,1.15);
    // Train spacing: slightly tighter gap for more enemies on screen
    const gap = Math.max(90, Math.min(220, 70 + S.enemyBaseSpeed*1.3));
    const base = Field.w + 40;
    const lastX = getMaxEnemyX();
    e.x = Math.max(base, lastX + gap);
    e.y = pickNonOverlappingY(e.x);
    ENEMIES.push(e);
  }

  function explode(x,y){
    for(let i=0;i<(S.reduced?6:12);i++){
      const p = getPart();
      p.alive=true; p.x=x; p.y=y; p.t=rand(0.2,0.5);
      const ang = rand(0,Math.PI*2); const sp = rand(40,120);
      p.vx = Math.cos(ang)*sp; p.vy = Math.sin(ang)*sp;
      PARTS.push(p);
    }
  }

  // ===== Math / Answers =====
  const UI = {
    app:qs('#app'), start:qs('#start'), how:qs('#howto'), game:qs('#game'), pause:qs('#pause'), over:qs('#over'),
    btnPlay:qs('#btnPlay'), btnHow:qs('#btnHow'), btnMuteStart:qs('#btnMuteStart'),
    btnPause:qs('#btnPause'), btnResume:qs('#btnResume'), btnMute:qs('#btnMute'), btnReplay:qs('#btnReplay'),
    hearts:qs('#hearts'), score:qs('#score'), best:qs('#best'), wave:qs('#wave'), target:qs('#target'),
    answers:qs('#answers'), btns:qsa('#answers .answer'),
    turbo:qs('#turboBadge'),
    finalScore:qs('#finalScore'), finalWave:qs('#finalWave'), bestLine:qs('#bestLine'),
  };

  function setMuteUI(m){ UI.btnMuteStart.textContent = m? '🔇 Ses: Kapalı' : '🔊 Ses: Açık'; UI.btnMute.textContent = m? '🔇' : '🔊'; }

  function updateHUD(){
    UI.hearts.textContent = '❤️'.repeat(S.lives);
    UI.score.textContent = `⭐ ${S.score}`;
    UI.best.textContent = `🏆 ${S.best}`;
    UI.wave.textContent = `🌊 ${S.wave}`;
    UI.target.textContent = `🎯 ${S.target}`;
    if(S.turbo){ UI.turbo.classList.add('badge--on'); UI.turbo.title = `Turbo ${Math.ceil(S.turboTime)}s`; UI.turbo.setAttribute('aria-label', UI.turbo.title); }
    else { UI.turbo.classList.remove('badge--on'); UI.turbo.title='Turbo'; UI.turbo.setAttribute('aria-label','Turbo'); }
  }

  // Answers reflect on-screen enemies (up to 4 closest unique products)
  let lastAnswerRefresh = 0;
  let lastShuffledTarget = null; // Option B: shuffle only when target changes
  function gatherAliveEnemiesSorted(){
    const arr = ENEMIES.filter(e=>e.alive).sort((a,b)=>a.x-b.x); // closest to base first
    return arr;
  }

  function getFrontEnemy(){
    for(const e of ENEMIES){ if(e.alive) { /* we need sorted order */ } }
    const arr = gatherAliveEnemiesSorted();
    return arr.length? arr[0] : null;
  }

  function ensureTarget(){
    const alive = gatherAliveEnemiesSorted();
    if(alive.length===0){ spawnEnemy({}); return ensureTarget(); }
    // Closest product is the target
    const closestProd = alive[0].prod;
    S.target = closestProd;
    // Collect unique on-screen products (excluding duplicates)
    const seen = new Set([closestProd]);
    let opts = [closestProd];
    for(let i=1;i<alive.length && opts.length<4;i++){
      const p = alive[i].prod; if(!seen.has(p)){ seen.add(p); opts.push(p); }
    }
    // Fill with distractors near the target
    function mkDistractors(t){
      const pool = [];
      const near = [t-1,t+1,t-2,t+2,t-3,t+3,t-10,t+10,t-5,t+5];
      for(const v of near){ if(v>1) pool.push(v); }
      // a few common confusions
      [42,54,56,63,72].forEach(v=>pool.push(v));
      return pool;
    }
    const pool = mkDistractors(closestProd);
    while(opts.length<4){
      const cand = pool.length? pool.splice(Math.floor(Math.random()*pool.length),1)[0] : closestProd + rint(-12,12);
      if(cand>1 && !seen.has(cand)){ seen.add(cand); opts.push(cand); }
    }
    // Option B refinement: if target didn't change, preserve current button order
    const currentVals = UI.btns.map(b=>parseInt(b.dataset.value||'NaN',10)).filter(v=>Number.isFinite(v));
    if(lastShuffledTarget === closestProd && currentVals.length===4 && currentVals.includes(closestProd)){
      // keep existing order
      opts = currentVals.slice(0,4);
    } else {
      // target changed -> shuffle once
      for(let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
      lastShuffledTarget = closestProd;
    }
    // Apply buttons; always show 4
    UI.btns.forEach((b,i)=>{
      b.classList.remove('answer--good','answer--bad');
      b.hidden = false; b.removeAttribute('aria-hidden');
      b.textContent = String(opts[i]);
      b.dataset.value = String(opts[i]);
    });
    // highlight target button
    UI.btns.forEach(b=>{
      if(parseInt(b.dataset.value||'-1',10)===S.target) b.classList.add('answer--target'); else b.classList.remove('answer--target');
    });
    lastAnswerRefresh = S.time;
    updateHUD();
  }

  function refreshIfNoMatchTimeout(){
    // If the closest product changed or options got stale, rebuild
    const alive = gatherAliveEnemiesSorted();
    const closest = alive.length? alive[0].prod : null;
    if(closest===null){ return; }
    if(closest!==S.target && S.time - lastAnswerRefresh > 0.1){ ensureTarget(); return; }
    // also refresh periodically to include new products
    if(S.time - lastAnswerRefresh > 2.0){ ensureTarget(); }
  }

  // ===== Waves =====
  function startWave(n){
    S.wave = n; S.intermission = true; S.interTime = 3.2; S.interStep = 3;
    // scale difficulty
    S.factorMax = clamp(9 + Math.floor((n-1)/1), 9, 20);
    S.enemyBaseSpeed = clamp(36 + (n-1)*3.7, 36, 130);
    S.spawnEvery = clamp(1.15 - (n-1)*0.07, 0.35, 1.4);
    // Wave 1 slight boost: a bit faster and more frequent spawns
    if(n===1){
      S.enemyBaseSpeed = Math.min(130, S.enemyBaseSpeed + 6);
      S.spawnEvery = Math.max(0.95, S.spawnEvery - 0.20);
    }
  }

  let spawnTimer = 0;
  function spawnLoop(dt){
    if(S.intermission) return;
    spawnTimer += dt;
    const every = S.spawnEvery * (S.freezeTime>0? 1.9:1);
    if(spawnTimer >= every){
      spawnTimer = 0;
      const runnerProb = clamp(0.02 + S.wave*0.01, 0.02, 0.18);
      spawnEnemy({ runnerProb });
      // keep target/options synced with the new front enemy
      ensureTarget();
    }
  }

  // ===== Input =====
  function onAnswer(btn){
    if(!S.running || S.paused) return;
    AudioMod.tap();
    const val = parseInt(btn.dataset.value,10);
    if(val === S.target){
      // find closest matching enemy to base
      let bestE=null, bestX=Infinity;
      for(const e of ENEMIES){ if(e.alive && e.prod===S.target && e.x < bestX){ bestX=e.x; bestE=e; } }
      if(bestE){
        killEnemy(bestE);
        UI.btns.forEach(b=>b.classList.remove('answer--bad'));
        btn.classList.add('answer--good');
        S.streak++;
        if(S.streak>0 && S.streak%3===0){ activateTurbo(); }
        ensureTarget(); // refresh after kill
      }
    }else{
      wrongAnswer(btn);
    }
  }

  function wrongAnswer(btn){
    S.streak=0;
    loseLife();
    btn.classList.add('answer--bad');
    if(!S.reduced) UI.answers.classList.add('shake');
    setTimeout(()=>UI.answers.classList.remove('shake'), 260);
    AudioMod.wrong();
  }

  function activateTurbo(){ S.turbo=true; S.turboTime=S.turboDur; AudioMod.turbo(); }
  function endTurbo(){ S.turbo=false; }

  function loseLife(){
    if(S.shield){ S.shield=false; AudioMod.power(); return; }
    S.lives = clamp(S.lives-1, 0, S.livesMax);
    if(S.lives<=0){ gameOver(); } else { updateHUD(); }
  }

  function maybeDropPower(x,y){
    if(Math.random()<0.10){ STARS.push({x,y,alive:true}); }
  }

  function applyPower(){
    // Freeze removed: always grant Shield
    S.shield = true;
    AudioMod.power();
  }

  function killEnemy(e){
    e.alive=false;
    explode(e.x, e.y);
    const gain = S.turbo? 20 : 10; S.score += gain; if(S.score>S.best){ S.best=S.score; try{ localStorage.setItem(STORAGE.best, String(S.best)); }catch{} }
    maybeDropPower(e.x, e.y);
    AudioMod.explode();
  }

  // ===== Game Loop =====
  function move(dt){
    // intermission countdown
    if(S.intermission){
      S.interTime -= dt; if(S.interTime <= (S.interStep-1)){ S.interStep--; }
      if(S.interTime <= 0){ S.intermission=false; ensureTarget(); }
    }

    if(S.freezeTime>0){ S.freezeTime -= dt; if(S.freezeTime<0) S.freezeTime=0; }

    // turbo
    if(S.turbo){ S.turboTime -= dt; if(S.turboTime<=0) endTurbo(); }

    // enemies
    for(const e of ENEMIES){
      if(!e.alive) continue;
      const freezeMul = S.freezeTime>0? 0.45 : 1;
      const turboMul = S.turbo? 1.0 : 1.0; // projectile speed would use turbo; enemies keep pace
      e.x -= e.v * freezeMul * turboMul * dt;
      // reach base
      if(e.x <= Field.baseX){ e.alive=false; loseLife(); S.streak=0; ensureTarget(); }
    }

    // Ensure continuous flow: if none alive and not in intermission, spawn immediately
    if(!S.intermission){
      const anyAlive = ENEMIES.some(e=>e.alive);
      if(!anyAlive){ const runnerProb = clamp(0.02 + S.wave*0.01, 0.02, 0.18); spawnEnemy({ runnerProb }); spawnTimer=0; ensureTarget(); }
    }

    // power-up stars drift to base
    for(const s of STARS){ if(!s.alive) continue; s.x -= 40*dt; if(s.x<=Field.baseX){ s.alive=false; applyPower(); } }

    // particles
    for(const p of PARTS){ if(!p.alive) continue; p.t -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 260*dt; if(p.t<=0) p.alive=false; }

    // spawn
    spawnLoop(dt);

    // answers upkeep
    refreshIfNoMatchTimeout();
  }

  function draw(){
    const w=Field.w, h=Field.h;
    // sky
    ctx.fillStyle = '#0b1329'; ctx.fillRect(0,0,w,h);
    // stars parallax
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for(let i=0;i<16;i++){ const sx=(i*67+(S.time*20))%w; const sy=(i*37)%Math.floor(h*0.6); ctx.fillRect(sx,sy,2,2); }
    // ground/base
    ctx.fillStyle = '#0d1a3d'; ctx.fillRect(0, h-40, w, 40);
    // castle
    ctx.fillStyle = '#2f7bfd'; ctx.fillRect(Field.baseX-24, h-80, 24, 80);

    // enemies
    const front = getFrontEnemy();
    for(const e of ENEMIES){ if(!e.alive) continue; drawEnemy(e); }
    // highlight front-most enemy
    if(front){
      ctx.save();
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
      ctx.strokeRect(front.x-32, front.y-22, 64, 44);
      // arrow above
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(front.x, front.y-30);
      ctx.lineTo(front.x-8, front.y-18);
      ctx.lineTo(front.x+8, front.y-18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // power-up stars
    for(const s of STARS){ if(!s.alive) continue; drawStar(s.x, h-70, 8); }

    // particles
    ctx.fillStyle = '#ffd166';
    for(const p of PARTS){ if(!p.alive) continue; ctx.globalAlpha = clamp(p.t/0.5, 0, 1); ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha=1; }

    // intermission text
    if(S.intermission){
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#e8f0ff'; ctx.font = `700 ${Math.floor(Math.min(48, w*0.08))}px system-ui`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`Wave ${S.wave}`, w/2, h/2 - 24);
      ctx.fillText(`${Math.max(1,S.interStep)}`, w/2, h/2 + 24);
    }
  }

  function drawEnemy(e){
    // body
    ctx.fillStyle = e.runner? '#ff8f4d' : '#4dd06c';
    ctx.strokeStyle = '#0b0f1a'; ctx.lineWidth=2;
    ctx.fillRect(e.x-30, e.y-20, 60, 40); ctx.strokeRect(e.x-30+0.5, e.y-20+0.5, 59, 39);
    // eyes
    ctx.fillStyle = '#0b0f1a'; ctx.fillRect(e.x-10, e.y-6, 6,6); ctx.fillRect(e.x+6, e.y-6, 6,6);
    // label
    ctx.fillStyle = '#d7ffe5'; ctx.font = '700 16px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${e.a}×${e.b}`, e.x, e.y+12);
  }

  function drawStar(x,y,r){
    ctx.save(); ctx.translate(x,y); ctx.rotate(((x+y+S.time*120)%360)*Math.PI/720);
    ctx.fillStyle='#ffcc33'; ctx.beginPath(); const spikes=5, outer=r, inner=r*0.5; let rot=Math.PI/2*3, cx=0, cy=0; ctx.moveTo(0, -outer);
    for(let i=0;i<spikes;i++){ cx=Math.cos(rot)*outer; cy=Math.sin(rot)*outer; ctx.lineTo(cx,cy); rot+=Math.PI/spikes; cx=Math.cos(rot)*inner; cy=Math.sin(rot)*inner; ctx.lineTo(cx,cy); rot+=Math.PI/spikes; }
    ctx.lineTo(0, -outer); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ===== Flow =====
  function reset(){
    S.running=true; S.paused=false; S.lives=S.livesMax; S.score=0; S.streak=0; S.turbo=false; S.turboTime=0; S.shield=false; S.freezeTime=0; S.time=0; S.last=0;
    ENEMIES.length=0; EPOOL.length=0; PARTS.length=0; PPOOL.length=0; STARS.length=0; spawnTimer=0;
    startWave(1);
    ensureTarget();
    resize();
    updateHUD();
  }

  function gameOver(){
    S.running=false;
    UI.over.hidden=false; UI.game.hidden=true; UI.start.hidden=true; UI.pause.hidden=true;
    UI.finalScore.textContent = `Skor: ${S.score}`;
    UI.finalWave.textContent = `Dalga: ${S.wave}`;
    UI.bestLine.textContent = `En İyi: ${S.best}`;
  }

  function nextWave(){ startWave(S.wave+1); }

  function tick(ts){
    if(!S.running){ return; }
    if(S.paused){ S.last=ts; requestAnimationFrame(tick); return; }
    if(!S.last) S.last=ts;
    let dt = (ts - S.last)/1000; dt = clamp(dt, 0, 0.05); S.last=ts; S.dt=dt; S.time += dt;

    move(dt);
    draw();
    updateHUD();

    // progress to next wave if few enemies remain and some time passed
    if(!S.intermission){
      const aliveCount = ENEMIES.filter(e=>e.alive).length;
      if(aliveCount<=2 && S.time - lastAnswerRefresh > 6){ nextWave(); }
    }

    requestAnimationFrame(tick);
  }

  // ===== Bindings =====
  function setMuted(m){ S.muted=m; setMuteUI(m); AudioMod.setMuted(m); try{ localStorage.setItem(STORAGE.muted, m?'1':'0'); }catch{} }

  function bind(){
    UI.btnPlay.addEventListener('click',()=>{ AudioMod.unlock(); AudioMod.tap(); UI.start.hidden=true; UI.over.hidden=true; UI.game.hidden=false; reset(); S.last=0; requestAnimationFrame(tick); });
    UI.btnHow.addEventListener('click',()=>{ AudioMod.tap(); UI.how.open = !UI.how.open; });

    setMuteUI(S.muted); AudioMod.setMuted(S.muted);
    UI.btnMuteStart.addEventListener('click',()=>{ setMuted(!S.muted); AudioMod.tap(); });
    UI.btnMute.addEventListener('click',()=>{ setMuted(!S.muted); AudioMod.tap(); });

    UI.btnPause.addEventListener('click',()=>{ if(!S.running) return; S.paused=!S.paused; UI.pause.hidden = !S.paused; AudioMod.tap(); });
    UI.btnResume.addEventListener('click',()=>{ S.paused=false; UI.pause.hidden=true; AudioMod.tap(); });
    UI.btnReplay.addEventListener('click',()=>{ AudioMod.tap(); UI.over.hidden=true; UI.game.hidden=false; reset(); S.last=0; requestAnimationFrame(tick); });

    UI.btns.forEach(btn=>{ btn.addEventListener('click',()=>onAnswer(btn), {passive:true}); });

    document.addEventListener('visibilitychange',()=>{ if(document.hidden && S.running){ S.paused=true; UI.pause.hidden=false; } }, {passive:true});
    window.addEventListener('orientationchange', ()=>{ setTimeout(resize, 120); }, {passive:true});
  }

  // ===== Reduced Motion =====
  S.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kickoff
  bind(); resize();
})();
