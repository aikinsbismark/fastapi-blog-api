import { login, authenticate, isAuthenticated } from '../actions/authentication.js';

const ADMIN_HOME = '/admin.html';

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('loginError');
const submitButton = loginForm.querySelector('button[type="submit"]');

const current = isAuthenticated();
if (current && current.role === 'admin') {
  window.location.href = ADMIN_HOME;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('d-none');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('d-none');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Enter your username and password.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Signing in...';

  try {
    const result = await login({ username, password }, 'admin');
    const data = result?.data;

    if (!result?.ok || !data?.access_token) {
      showError(data?.detail || 'Incorrect username or password.');
      return;
    }

    authenticate(data, 'admin', () => {
      window.location.href = ADMIN_HOME;
    });
  } catch (error) {
    showError('Network error. Check your connection and try again.');
    console.error('Admin login error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';
  }
});