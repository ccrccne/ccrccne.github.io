// Atrapa estrellas: mueve la nubecita para atrapar estrellas y esquiva las nubes de tormenta.
(() => {
    const canvas = document.getElementById("game");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const box = canvas.parentElement;
    const overlay = document.getElementById("game-overlay");
    const playBtn = document.getElementById("game-play");
    const resultEl = document.getElementById("game-result");
    const root = document.documentElement;
    const es = () => root.lang !== "en";

    let W = 0, H = 0, dpr = 1;
    let bgStars = [];
    let state = "idle"; // idle | playing | over
    let player, items, sparks, popups, score, lives, elapsed, spawnIn, hurt, last = 0, keys = {};
    let best = 0;
    try { best = +localStorage.getItem("stars-best") || 0; } catch { }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = box.clientWidth; H = box.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bgStars = Array.from({ length: Math.round(W * H / 3000) }, () => ({
            x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .3, p: Math.random() * 6
        }));
        if (player) player.y = H - 46;
        if (state !== "playing") draw(performance.now());
    }

    function reset() {
        player = { x: W / 2, y: H - 46, tx: W / 2, w: 92 };
        items = []; sparks = []; popups = [];
        score = 0; lives = 3; elapsed = 0; spawnIn = 600; hurt = 0;
    }

    function spawn() {
        const level = Math.min(elapsed / 60000, 1); // llega a la dificultad máxima en un minuto
        const roll = Math.random();
        const stormChance = .08 + level * .2;
        const kind = roll < stormChance ? "storm" : roll < stormChance + .1 ? "gold" : "star";
        const r = kind === "storm" ? 26 : kind === "gold" ? 17 : 12;
        items.push({
            kind, r,
            x: r + Math.random() * (W - r * 2), y: -r * 2,
            vy: (130 + level * 170) * (kind === "gold" ? 1.25 : 1) * (.85 + Math.random() * .3),
            rot: Math.random() * 6, spin: (Math.random() - .5) * 3,
            sway: Math.random() * 6
        });
        spawnIn = 850 - level * 470 + Math.random() * 250;
    }

    function burst(x, y, color, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 140;
            sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: .5 + Math.random() * .4, color });
        }
    }

    function update(dt) {
        elapsed += dt * 1000;
        const speed = 620;
        if (keys.left) player.tx -= speed * dt;
        if (keys.right) player.tx += speed * dt;
        player.tx = Math.max(player.w / 2, Math.min(W - player.w / 2, player.tx));
        player.x += (player.tx - player.x) * Math.min(dt * 14, 1);
        if (hurt > 0) hurt -= dt;

        spawnIn -= dt * 1000;
        if (spawnIn <= 0) spawn();

        for (const it of items) {
            it.y += it.vy * dt;
            it.rot += it.spin * dt;
            if (it.kind === "storm") it.x += Math.sin(elapsed / 500 + it.sway) * 30 * dt;
            const dx = Math.abs(it.x - player.x);
            if (!it.done && it.y + it.r * .5 > player.y - 16 && it.y - it.r < player.y + 10 && dx < player.w / 2 + it.r * .4) {
                it.done = true;
                if (it.kind === "storm") {
                    lives--; hurt = .8;
                    burst(it.x, it.y, "#9aa6d6", 16);
                    if (lives <= 0) return gameOver();
                } else {
                    const pts = it.kind === "gold" ? 3 : 1;
                    score += pts;
                    burst(it.x, it.y, it.kind === "gold" ? "#ffcf4a" : "#fff3b8", it.kind === "gold" ? 18 : 10);
                    popups.push({ x: it.x, y: it.y - 10, text: "+" + pts, life: 0 });
                }
            }
            if (it.y - it.r > H) it.done = true;
        }
        items = items.filter(it => !it.done);

        for (const s of sparks) { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; }
        sparks = sparks.filter(s => s.life < s.max);
        for (const p of popups) { p.life += dt; p.y -= 40 * dt; }
        popups = popups.filter(p => p.life < .8);
    }

    // ---------- Dibujo ----------
    function starPath(x, y, r, rot) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = rot + i * Math.PI / 5 - Math.PI / 2;
            const rr = i % 2 ? r * .48 : r;
            ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
    }

    function drawStar(it) {
        const gold = it.kind === "gold";
        ctx.save();
        ctx.shadowColor = gold ? "rgba(255, 200, 60, .9)" : "rgba(255, 240, 170, .7)";
        ctx.shadowBlur = gold ? 22 : 12;
        starPath(it.x, it.y, it.r, it.rot);
        ctx.fillStyle = gold ? "#ffc93c" : "#ffe27a";
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2; ctx.lineJoin = "round";
        ctx.strokeStyle = gold ? "#e89a1c" : "#f4b73f";
        ctx.stroke();
        if (gold) { // carita
            ctx.fillStyle = "#7a4a12";
            ctx.beginPath(); ctx.arc(it.x - 4, it.y, 1.6, 0, 7); ctx.arc(it.x + 4, it.y, 1.6, 0, 7); ctx.fill();
        }
    }

    function cloudShape(x, y, w) {
        const h = w * .42;
        ctx.beginPath();
        ctx.arc(x - w * .26, y + h * .1, h * .5, Math.PI * .5, Math.PI * 1.5);
        ctx.arc(x - w * .08, y - h * .22, h * .55, Math.PI, Math.PI * 1.85);
        ctx.arc(x + w * .2, y - h * .08, h * .48, Math.PI * 1.2, Math.PI * 2);
        ctx.arc(x + w * .3, y + h * .14, h * .42, Math.PI * 1.5, Math.PI * .5);
        ctx.closePath();
    }

    function face(x, y, s, sad, eyes, blush) {
        ctx.fillStyle = eyes;
        ctx.beginPath(); ctx.arc(x - 9 * s, y, 2.6 * s, 0, 7); ctx.arc(x + 9 * s, y, 2.6 * s, 0, 7); ctx.fill();
        ctx.strokeStyle = eyes; ctx.lineWidth = 2 * s; ctx.lineCap = "round";
        ctx.beginPath();
        if (sad) ctx.arc(x, y + 9 * s, 4 * s, Math.PI * 1.15, Math.PI * 1.85);
        else ctx.arc(x, y + 3 * s, 4 * s, Math.PI * .15, Math.PI * .85);
        ctx.stroke();
        if (blush) {
            ctx.fillStyle = blush;
            ctx.beginPath(); ctx.ellipse(x - 16 * s, y + 5 * s, 4 * s, 2.5 * s, 0, 0, 7); ctx.ellipse(x + 16 * s, y + 5 * s, 4 * s, 2.5 * s, 0, 0, 7); ctx.fill();
        }
    }

    function drawPlayer(t) {
        const { x, y, w } = player;
        const blink = hurt > 0 && Math.floor(hurt * 10) % 2 === 0;
        if (blink) ctx.globalAlpha = .45;
        const bob = Math.sin(t / 300) * 2;
        ctx.save();
        ctx.shadowColor = "rgba(124, 200, 242, .7)"; ctx.shadowBlur = 18;
        cloudShape(x, y + bob, w);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.restore();
        cloudShape(x, y + bob, w);
        ctx.strokeStyle = "#cfeafc"; ctx.lineWidth = 2; ctx.stroke();
        face(x, y + bob, 1, hurt > 0, "#1d3b55", "rgba(240, 139, 180, .55)");
        ctx.globalAlpha = 1;
    }

    function drawStorm(it) {
        const w = it.r * 2.6;
        cloudShape(it.x, it.y, w);
        ctx.fillStyle = "#6f7aa8"; ctx.fill();
        ctx.strokeStyle = "#535d8a"; ctx.lineWidth = 2; ctx.stroke();
        face(it.x, it.y - 2, .7, true, "#2a3157");
        // rayito
        ctx.fillStyle = "#ffe27a";
        ctx.beginPath();
        const bx = it.x + 4, by = it.y + it.r * .55;
        ctx.moveTo(bx, by); ctx.lineTo(bx - 7, by + 12); ctx.lineTo(bx - 1, by + 12); ctx.lineTo(bx - 5, by + 22);
        ctx.lineTo(bx + 6, by + 8); ctx.lineTo(bx, by + 8); ctx.lineTo(bx + 4, by);
        ctx.closePath(); ctx.fill();
    }

    function heart(x, y, s, full) {
        ctx.beginPath();
        ctx.moveTo(x, y + s * .35);
        ctx.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45);
        ctx.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35);
        ctx.fillStyle = full ? "#f08bb4" : "rgba(255, 255, 255, .18)";
        ctx.fill();
    }

    function draw(t) {
        ctx.clearRect(0, 0, W, H);
        for (const s of bgStars) {
            ctx.fillStyle = `rgba(240, 246, 255, ${.35 + .5 * Math.abs(Math.sin(t / 900 + s.p))})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
        }
        if (!player) return;
        for (const it of items) it.kind === "storm" ? drawStorm(it) : drawStar(it);
        for (const s of sparks) {
            ctx.globalAlpha = 1 - s.life / s.max;
            ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
        drawPlayer(t);
        ctx.font = "700 18px Fredoka, Nunito, sans-serif"; ctx.textAlign = "center";
        for (const p of popups) {
            ctx.globalAlpha = 1 - p.life / .8;
            ctx.fillStyle = "#fff3b8";
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // Marcador
        if (state === "playing") {
            ctx.textAlign = "left";
            ctx.font = "700 22px Fredoka, Nunito, sans-serif";
            ctx.fillStyle = "#ffe27a";
            starPath(26, 30, 11, 0); ctx.fill();
            ctx.fillStyle = "#ffffff"; ctx.fillText(score, 44, 38);
            ctx.font = "600 13px Nunito, sans-serif"; ctx.fillStyle = "rgba(220, 236, 252, .75)";
            ctx.fillText((es() ? "Récord: " : "Best: ") + best, 18, 60);
            for (let i = 0; i < 3; i++) heart(W - 26 - i * 26, 30, 11, i < lives);
        }
    }

    function loop(t) {
        const dt = Math.min((t - last) / 1000, .05); last = t;
        if (state === "playing" && !document.hidden) update(dt);
        draw(t);
        if (state === "playing" || sparks.length) requestAnimationFrame(loop);
        else running = false;
    }
    let running = false;
    function run() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

    function start() {
        reset();
        state = "playing";
        overlay.hidden = true;
        canvas.focus({ preventScroll: true });
        run();
    }

    function gameOver() {
        state = "over";
        const record = score > best;
        if (record) { best = score; try { localStorage.setItem("stars-best", best); } catch { } }
        resultEl.innerHTML = es()
            ? `${record && score > 0 ? "¡Nuevo récord! " : ""}Atrapaste <b>${score}</b> ${score === 1 ? "estrella" : "estrellas"} ✦`
            : `${record && score > 0 ? "New best! " : ""}You caught <b>${score}</b> ${score === 1 ? "star" : "stars"} ✦`;
        resultEl.hidden = false;
        playBtn.querySelector('[lang="es"]').textContent = "Otra vez";
        playBtn.querySelector('[lang="en"]').textContent = "Play again";
        overlay.hidden = false;
    }

    // ---------- Controles ----------
    function pointTo(e) {
        const rect = canvas.getBoundingClientRect();
        if (player) player.tx = e.clientX - rect.left;
    }
    canvas.addEventListener("pointermove", pointTo);
    canvas.addEventListener("pointerdown", pointTo);
    const keyMap = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    canvas.addEventListener("keydown", e => { if (keyMap[e.key]) { keys[keyMap[e.key]] = true; e.preventDefault(); } });
    canvas.addEventListener("keyup", e => { if (keyMap[e.key]) keys[keyMap[e.key]] = false; });
    canvas.addEventListener("blur", () => { keys = {}; });
    playBtn.addEventListener("click", start);

    new ResizeObserver(resize).observe(box);
    resize();
    reset(); // así la nubecita ya espera en la pantalla de inicio
    // El cielo de fondo titila aunque no se esté jugando, solo mientras se ve la sección
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        let idleTimer = 0;
        const idle = t => { if (state !== "playing") draw(t); idleTimer = requestAnimationFrame(idle); };
        new IntersectionObserver(([e]) => {
            cancelAnimationFrame(idleTimer);
            if (e.isIntersecting) idleTimer = requestAnimationFrame(idle);
        }).observe(box);
    }
})();
