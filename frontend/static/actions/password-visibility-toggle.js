export function initPasswordToggle() {
  const passwordFields = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'confirmNewPassword',
  ];

  passwordFields.forEach(id => {
    const passwordInput = document.getElementById(id);
    if (passwordInput) {
        createToggleButton(passwordInput);
    }
    });
}

function createToggleButton(inputField) {
    if (inputField.parentElement?.classList.contains("password-input-wrapper")) {
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "password-input-wrapper";

    inputField.parentNode.insertBefore(wrapper, inputField);
    wrapper.appendChild(inputField);

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "password-toggle";
    toggleButton.setAttribute("aria-label", "Show password");
    toggleButton.setAttribute("aria-pressed", "false");
    toggleButton.innerHTML =
        '<i class="fas fa-eye" aria-hidden="true"></i>';

    wrapper.appendChild(toggleButton);

    toggleButton.addEventListener("click", () => {
        const passwordHidden = inputField.type === "password";

        inputField.type = passwordHidden ? "text" : "password";

        toggleButton.innerHTML = passwordHidden
            ? '<i class="fas fa-eye-slash" aria-hidden="true"></i>'
            : '<i class="fas fa-eye" aria-hidden="true"></i>';

        toggleButton.setAttribute(
            "aria-label",
            passwordHidden ? "Hide password" : "Show password"
        );

        toggleButton.setAttribute(
            "aria-pressed",
            String(passwordHidden)
        );
    });
}