const toggle = document.querySelector('#themeSwitch');
const storedTheme = localStorage.getItem('blog-theme');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('blog-theme', theme);
  toggle?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}

setTheme(storedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
toggle?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
