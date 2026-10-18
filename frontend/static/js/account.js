import { requireAuth, logout } from '../actions/guard.js';
import {
  extractToken,
  getCurrentAuthor,
  getCurrentAdmin,
  getCurrentUser,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  deleteAccount,
} from '../actions/authentication.js';
import { getErrorMessage } from '../actions/utils.js';

const MAX_PICTURE_SIZE = 5 * 1024 * 1024; 


function getCurrentProfileFetcher(role) {
  if (role === 'admin') {
    return getCurrentAdmin;
  }
  if (role === 'author') {
    return getCurrentAuthor;
  }
  if (role === 'user') {
    return getCurrentUser;
  }
  return null;
}

async function loadProfile(token, role) {
  const fetchCurrent = getCurrentProfileFetcher(role);
  if (!fetchCurrent) {
    return null;
  }
  const profile = await fetchCurrent(token);
  if (!profile) {
    return null;
  }


  document.getElementById('displayUsername').textContent = profile.username || '';
  document.getElementById('displayEmail').textContent = profile.email_address || profile.email || '';
  document.getElementById('username').value = profile.username || '';
  document.getElementById('email').value = profile.email_address || profile.email || '';

  if (profile.image_path) {
    document.getElementById('profilePicture').src = profile.image_path;
  }

  return profile;
}

function wireUpdateProfileForm(token, role) {
  const form = document.getElementById('updateProfileForm');
  const errorElement = document.getElementById('profileFormError');
  const successElement = document.getElementById('profileFormSuccess');
  const submitBtn = document.getElementById('updateProfileBtn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorElement.classList.add('d-none');
    successElement.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;

    try {
      const response = await updateProfile(token, role, { username, email });

      if (response.ok) {
        successElement.textContent = 'Profile updated successfully.';
        document.getElementById('displayUsername').textContent = username;
        document.getElementById('displayEmail').textContent = email;
      } else {
        errorElement.textContent = getErrorMessage(response.data);
        errorElement.classList.remove('d-none');
      }
    } catch (error) {
      errorElement.textContent = 'Network error. Please check your connection and try again.';
      errorElement.classList.remove('d-none');
      console.error('updateProfile failed:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Profile';
    }
  });
}

function wirePictureUpload(token, role, userId) {
  const fileInput = document.getElementById('pictureInput');
  const uploadBtn = document.getElementById('uploadPictureBtn');
  const preview = document.getElementById('imagePreview');
  const errorElement = document.getElementById('pictureError');
  const successElement = document.getElementById('pictureSuccess');

  fileInput.addEventListener('change', () => {
    errorElement.classList.add('d-none');
    successElement.textContent = '';

    const file = fileInput.files[0];
    if (!file) {
      uploadBtn.disabled = true;
      preview.classList.add('d-none');
      return;
    }

    if (file.size > MAX_PICTURE_SIZE) {
      errorElement.textContent = 'File is too large. Maximum size is 5MB.';
      errorElement.classList.remove('d-none');
      uploadBtn.disabled = true;
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    uploadBtn.disabled = false;
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    errorElement.classList.add('d-none');
    successElement.textContent = '';
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
      const response = await uploadProfilePicture(token, role, userId, file);

      if (response.ok) {
        successElement.textContent = 'Profile picture updated.';
        if (response.data?.image_path) {
          document.getElementById('profilePicture').src = response.data.image_path;
        }
        fileInput.value = '';
        preview.classList.add('d-none');
      } else {
        errorElement.textContent = getErrorMessage(response.data);
        errorElement.classList.remove('d-none');
      }
    } catch (error) {
      errorElement.textContent = 'Network error. Please check your connection and try again.';
      errorElement.classList.remove('d-none');
      console.error('uploadProfilePicture failed:', error);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload';
    }
  });
}

function wireChangePasswordForm(token, role) {
  const form = document.getElementById('changePasswordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmNewPassword');
  const passwordError = document.getElementById('passwordError');
  const formError = document.getElementById('formError');
  const formSuccess = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('changePasswordBtn');

  function checkPasswordsMatch() {
    if (newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.classList.add('is-invalid');
      passwordError.classList.remove('d-none');
    } else {
      confirmPasswordInput.classList.remove('is-invalid');
      passwordError.classList.add('d-none');
    }
  }

  [newPasswordInput, confirmPasswordInput].forEach((input) => {
    input.addEventListener('input', checkPasswordsMatch);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.classList.add('d-none');
    formSuccess.textContent = '';

    if (newPasswordInput.value !== confirmPasswordInput.value) {
      passwordError.classList.remove('d-none');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const currentPassword = document.getElementById('currentPassword').value;

    try {
      const response = await changePassword(token, role, currentPassword, newPasswordInput.value);

      if (response.ok) {
        formSuccess.textContent = 'Password updated successfully.';
        form.reset();
      } else {
        formError.textContent = getErrorMessage(response.data);
        formError.classList.remove('d-none');
      }
    } catch (error) {
      formError.textContent = 'Network error. Please check your connection and try again.';
      formError.classList.remove('d-none');
      console.error('changePassword failed:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Change Password';
    }
  });
}

function wireDeleteAccount(token, role) {
  const confirmBtn = document.getElementById('confirmDeleteAccount');

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    try {
      const response = await deleteAccount(token, role);

      if (response.ok) {
        logout(); 
        return;
      }

      alert(getErrorMessage(response.data) || 'Failed to delete account.');
    } catch (error) {
      alert('Network error. Please check your connection and try again.');
      console.error('deleteAccount failed:', error);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete Account';
    }
  });
}

async function init() {
  const user = requireAuth();
  if (!user) {
    return;
  }

  document.getElementById('guardLoading').style.display = 'none';
  document.getElementById('app').style.display = '';

  const token = extractToken(user);
  const role = user.role;

  const profile =  await loadProfile(token, role);
  if (!profile) {
    return;
  }

  wireUpdateProfileForm(token, role);
  wirePictureUpload(token, role, profile.id);
  wireChangePasswordForm(token, role);
  wireDeleteAccount(token, role);

  document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', init);