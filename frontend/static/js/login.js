import { login, authenticate, isAuthenticated } from '../actions/authentication.js';
import { initPasswordToggle } from '../actions/password-visibility-toggle.js';


const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginForm = document.getElementById('loginForm');
const submitButton = document.querySelector('button[type="submit"]');


initPasswordToggle();

const currentUser = isAuthenticated();
if (currentUser) {
    redirectByRole(currentUser.role);
}

function clearValidity() {
    usernameInput.setCustomValidity('');
    passwordInput.setCustomValidity('');
}

usernameInput.addEventListener('input', clearValidity);
passwordInput.addEventListener('input', clearValidity);


loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearValidity();

    const formData = new FormData(loginForm);
    const username = formData.get('username').trim();
    const password = formData.get('password');
    const role = formData.get('role') || 'user';

    submitButton.disabled = true;

    try {
        const data = await login({ username, password }, role);

        if (!data || data.detail || !data.access_token) {
            const msg = data?.detail || 'Incorrect username or password.';
            usernameInput.setCustomValidity(msg);
            passwordInput.setCustomValidity(msg);
            passwordInput.reportValidity();
            return;
        }

        authenticate(
            { user: { 
                ...data.user, 
                role: data.user.role ?? role,
                token: data.access_token
             } ,
            },
            (user) => {
                redirectByRole(user?.role ?? role);
            }
        );
    } catch (error) {
        const msg =
        error?.message || 'Network error. Please check your connection and try again.';
        usernameInput.setCustomValidity(msg);
        passwordInput.setCustomValidity(msg);
        passwordInput.reportValidity();
        console.error('Login error:', error);
    } finally {
        submitButton.disabled = false;
    }
});

function redirectByRole(role) {
    const destinations = {
        admin: '/admin.html',
        author: '/author.html',
        user: '/index.html'
    };
    window.location.href = destinations[role] ?? '/index.html';
}