import { removeLocalStorage } from "../../../actions/authentication.js";


export function initializeNavigation() {
    initializeViewSwitching();
    initializeLogout();
}

function initializeViewSwitching() {
    const navigationItems = document.querySelectorAll(".nav-item");
    const views = document.querySelectorAll(".view");

    navigationItems.forEach(item => {
        item.addEventListener("click", (event) => {
            event.preventDefault();

            const selectedView = item.dataset.view;

            if (!selectedView) {
                return;
            }

            navigationItems.forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

            views.forEach(view => {
                const isSelected = view.id === `view-${selectedView}`;
                view.classList.toggle("active", isSelected);
            });
        });
    });
}

function initializeLogout() {
    const logoutButton = document.getElementById("logoutBtn");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", () => {
        removeLocalStorage("user");
        window.location.href = "/login.html";
    })
}