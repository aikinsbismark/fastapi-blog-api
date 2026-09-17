import { signup } from '../actions/authentication.js';
import { initPasswordToggle } from '../actions/password-visibility-toggle.js';



initPasswordToggle();


function getErrorMessage(error) {
    if (!error) {
        return 'Something went wrong. Please try again.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (Array.isArray(error.detail)) {
        return error.detail.map(item => item.msg).filter(Boolean).join(' ');
    }

    if (typeof error.detail === 'string') {
        return error.detail;
    }

    if (typeof error.message === 'string') {
        return error.message;
    }

    return 'Something went wrong. Please try again.';
}


const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');

if (registerForm && confirmPasswordInput && passwordInput) {

    [usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', () => {
            input.setCustomValidity('');
        });
    });

    function checkPasswordsMatch() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.classList.add('is-invalid');
            passwordError.classList.remove('d-none');
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.classList.remove('is-invalid');
            passwordError.classList.add('d-none');
            confirmPasswordInput.setCustomValidity('');
        }
    }

    [passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', checkPasswordsMatch);
    });


registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (passwordInput.value !== confirmPasswordInput.value) {
        passwordError.classList.remove('d-none');
        return;
    }

    const formData = new FormData(registerForm);
    const selectRole = formData.get('role');

    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        email_address: formData.get('email'),
    };

    try {
        const response = await signup(userData, selectRole);

        if (response.ok) {
            document.getElementById('successMessage').textContent =
                'Account created successfully! Please login.';

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

            return;
        }

        const error = response.data;
        const msg = getErrorMessage(error);

        if (error?.field === 'username' || msg.toLowerCase().includes('username')) {
            usernameInput.setCustomValidity(msg);
            usernameInput.reportValidity();
        } else if (error?.field === 'email' || msg.toLowerCase().includes('email')) {
            emailInput.setCustomValidity(msg);
            emailInput.reportValidity();
        } else {
            passwordInput.setCustomValidity(msg);
            confirmPasswordInput.setCustomValidity(msg);

            passwordInput.reportValidity();
        }
    } catch (error) {
        const msg = getErrorMessage(error) || 'Network error. Please check your connection and try again.';
        passwordInput.setCustomValidity(msg);
        confirmPasswordInput.setCustomValidity(msg);

        passwordInput.reportValidity();
    }
});
}