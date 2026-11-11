import { resetPassword } from "../actions/authentication.js";

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const role = urlParams.get('role');

const VALID_ROLES = ['user', 'author', 'admin'];

const resetPasswordForm = document.getElementById('resetPasswordForm');
const missingTokenMessage = document.getElementById('missingTokenMessage');
const passwordError = document.getElementById('passwordError');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');


if (!token || !VALID_ROLES.includes(role)) {
    resetPasswordForm.classList.add('d-none');
    formError.classList.add('d-none');
    missingTokenMessage.classList.remove('d-none');
}


resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    formError.classList.add('d-none');
    passwordError.classList.add('d-none');
    confirmPasswordInput.classList.remove('is-invalid');

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        passwordError.textContent = 'Passwords do not match.';
        passwordError.classList.remove('d-none');
        confirmPasswordInput.classList.add('is-invalid');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';
    let succeeded = false;

    try {
        const response = await resetPassword(token, role, newPassword);

        if (response.ok) {
            succeeded = true;
            formSuccess.textContent = 'Password reset successfully! Redirecting to login...';

            resetPasswordForm.reset();
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

            return;
        }

        if (response.status === 400) {
            formError.textContent =
                'This reset link is invalid or has expired. Please request a new one.';
        } else {
            formError.textContent =
                response.data?.detail || 'Something went wrong. Please try again.';
        }
        formError.classList.remove('d-none');
    } catch (error) {
        formError.textContent = 'Network error. Please check your connection and try again.';
        formError.classList.remove('d-none');
        console.error('resetPassword failed:', error);
    } finally {
        if (!succeeded) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
        }
    }
});