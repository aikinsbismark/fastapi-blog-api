import { forgotPassword } from "../actions/authentication.js";



const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');


forgotPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;


    try {
        const response = await forgotPassword(email, role);

        if (response.status === 202) {
            formSuccess.textContent = 
            'If an account exists with this email, you will receive password reset instructions shortly.';

            forgotPasswordForm.reset();
        } else {
            formError.textContent = 
            response.data?.detail || 'Something went wrong. Please try again.'
            formError.classList.remove('d-none');
        }
    } catch (error) {
        formError.textContent = 'Network error. Please check your connection and try again.';
        formError.classList.remove('d-none');
        console.error('forgotPassword failed:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
    }
});