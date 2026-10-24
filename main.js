// Idioma: español por defecto; recuerda la elección o usa el idioma del navegador.
const root = document.documentElement;
const btn = document.getElementById("lang");

function setLang(lang) {
    root.lang = lang;
    btn.textContent = lang === "es" ? "EN" : "ES";
    try { localStorage.setItem("lang", lang); } catch { }
}

let saved = null;
try { saved = localStorage.getItem("lang"); } catch { }
setLang(saved ?? (navigator.language.startsWith("es") ? "es" : "en"));

btn.addEventListener("click", () => setLang(root.lang === "es" ? "en" : "es"));

// Modo claro / oscuro (el inicial ya lo puso el script del <head>)
document.getElementById("theme").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { }
});

// Copiar el usuario de Discord
for (const el of document.querySelectorAll(".copy")) {
    el.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(el.dataset.copy);
            el.classList.add("copied");
            const hint = el.querySelector(".hint");
            const old = hint.innerHTML;
            hint.textContent = root.lang === "es" ? "✓ ¡copiado!" : "✓ copied!";
            setTimeout(() => { hint.innerHTML = old; el.classList.remove("copied"); }, 1500);
        } catch { }
    });
}

// Filtros de proyectos por plataforma
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");
for (const f of filters) {
    f.addEventListener("click", () => {
        const cat = f.dataset.filter;
        filters.forEach(x => x.setAttribute("aria-pressed", String(x === f)));
        projects.forEach(p => p.classList.toggle("hidden", cat !== "all" && p.dataset.cat !== cat));
    });
}

// Las tarjetas aparecen suavemente al llegar a ellas
const revealables = document.querySelectorAll(".stats li, .card, .place, h2");
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        }
    }, { threshold: .12 });
    revealables.forEach(el => { el.classList.add("reveal"); io.observe(el); });
}
