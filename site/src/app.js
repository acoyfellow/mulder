if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));

const menu = document.querySelector("[data-menu]");
const navigation = document.querySelector("[data-navigation]");
menu?.addEventListener("click", () => {
  const open = navigation?.toggleAttribute("data-open");
  menu.setAttribute("aria-expanded", String(Boolean(open)));
});

const dialog = document.querySelector("[data-search-dialog]");
const input = dialog?.querySelector("input");
const results = dialog?.querySelector("[data-search-results]");
let index = [];

async function openSearch() {
  if (!dialog) return;
  if (!index.length) index = await fetch("/search-index.json").then((response) => response.json());
  dialog.showModal();
  input?.focus();
}

document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
dialog?.querySelector("[data-search-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
input?.addEventListener("input", () => {
  const query = input.value.trim().toLowerCase();
  const matches = query ? index.filter((item) => `${item.title} ${item.description} ${item.text}`.toLowerCase().includes(query)).slice(0, 8) : index.slice(0, 6);
  results.innerHTML = matches.map((item) => `<a href="${item.path}"><strong>${item.title}</strong><span>${item.description}</span></a>`).join("") || "<p>No matching page.</p>";
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
  if (event.key === "Escape" && dialog?.open) dialog.close();
});

document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  const code = document.getElementById(button.dataset.copy)?.textContent ?? "";
  await navigator.clipboard.writeText(code);
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = "Copy"; }, 1400);
}));
