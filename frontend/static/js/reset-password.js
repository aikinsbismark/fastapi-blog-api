import { resetPassword } from "../actions/authentication.js";



const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const role = urlParams.get('role');

const resetPasswordForm = document.getElementById('resetPasswordForm');
const missingTokenMessage = document.getElementById('missingTokenMessage');
const passwordError = document.getElementById('passwordError');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');


if (!token || ! role) {
    resetPasswordForm.classList.add('d-none');
    formError.classList.add('d-none');
    missingTokenMessage.classList.remove('d-none');
} 


resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    formError.classList.add('d-none');
    passwordError.classList.add('d-none');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        passwordError.textContent = 'Passwords do not match.'
        passwordError.classList.remove('d-none');
        confirmPassword.classList.add('is-invalid');
        confirmPassword.classList.remove('d-none');

        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';

        return;
    }

    try {
        const response = await resetPassword(token, role, newPassword);

        if (response.ok) {
            formSuccess.textContent = 'Password reset successfully! Redirecting to login...';

            resetPasswordForm.reset();
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

            return;
        }
        
        if (response.status === 400) {
            formError.textContent +=
            ' This reset link may have expired. Please request a new one.';
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
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
    }
});