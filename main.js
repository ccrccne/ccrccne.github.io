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

// Copiar el usuario de Discord
const copy = document.getElementById("copy-discord");
copy.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        copy.classList.add("copied");
        setTimeout(() => copy.classList.remove("copied"), 1500);
    } catch { }
});
