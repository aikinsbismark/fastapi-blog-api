/* Shared monochrome theme and navigation controls for every template. */
const controls = document.createElement("div");
controls.className = "site-controls";
controls.innerHTML = `
  <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to dark theme" aria-pressed="false">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>
  </button>
  <button class="menu-toggle" type="button" role="button" data-menu-toggle aria-controls="siteMenu" aria-expanded="false" aria-label="Open navigation menu"><span></span><span></span><span></span></button>
`;

const menu = document.createElement("nav");
menu.className = "site-menu";
menu.id = "siteMenu";
menu.setAttribute("aria-label", "Main navigation");
menu.setAttribute("aria-hidden", "true");
const existingNav = document.getElementById("navbarNav");
if (existingNav) {
  menu.append(existingNav);
} else {
  menu.innerHTML = `<ul class="navbar-nav">
    <li class="nav-item"><a class="nav-link" href="/static/templates/index.html">Home</a></li>
    <li class="nav-item"><a class="nav-link" href="/static/templates/login.html">Login</a></li>
    <li class="nav-item"><a class="nav-link" href="/static/templates/signup.html">Sign up</a></li>
    <li class="nav-item"><a class="nav-link" href="/static/templates/profile.html">Profile</a></li>
    <li class="nav-item"><a class="nav-link" href="/static/templates/author.html">Author dashboard</a></li>
    <li class="nav-item"><a class="nav-link" href="/static/templates/admin.html">Admin dashboard</a></li>
  </ul>`;
}
document.body.prepend(menu);
document.body.prepend(controls);

const menuButton = controls.querySelector("[data-menu-toggle]");
function setMenuOpen(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  menu.setAttribute("aria-hidden", String(!open));
  menu.classList.toggle("is-open", open);
}
menuButton.addEventListener("click", () => setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true"));
document.addEventListener("click", (event) => {
  if (!controls.contains(event.target) && !menu.contains(event.target)) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuButton.focus();
  }
});
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});

const themeButton = controls.querySelector("[data-theme-toggle]");
const themeIcon = {
  light: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>',
  dark: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"></path>'
};
function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("theme-dark", dark);
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  themeButton.querySelector("svg").innerHTML = themeIcon[dark ? "dark" : "light"];
  try { localStorage.setItem("blog-theme", dark ? "dark" : "light"); } catch (_) { /* Storage may be unavailable. */ }
}
let savedTheme = "light";
try { savedTheme = localStorage.getItem("blog-theme") === "dark" ? "dark" : "light"; } catch (_) { /* Use the light default. */ }
applyTheme(savedTheme);
themeButton.addEventListener("click", () => applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark"));
