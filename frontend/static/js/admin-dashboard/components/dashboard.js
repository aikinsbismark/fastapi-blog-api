import { config } from "../../config.js";
import { isAuthenticated, getCurrentAdmin } from "../../../actions/authentication.js";
import { loadUsers } from "./users.js";
import { loadPendingBlogs, createPendingCard, renderRecentPending } from "./pending-posts.js";


let currentAdmin = null;
let token = null;

export async function initializeDashboard() {
    const session = isAuthenticated();

    if (!session) {
        window.location.href ="/login.html";
        return;
    }

    token = sesison.access_token || session.token;

    currentAdmin = await getCurrentAdmin(token);

    if (!currentAdmin) {
        window.location.href = "/login.html";
        return;
    }

    showDashBoard();
    await loadDashBoard();
}

async function loadDashboard() {
    try {
        await Promise.all([loadUsers(), loadPendingBlogs()]);

        updateWelcomeMessage();
        updateStatistics();
        renderRecentPending();

    } catch (error) {
        console.error("Dashboard failed to load:", error);
        showToast("Something went wrong loading the dashboard. Please refresh.", error);
    }
}

function showDashboard() {
    document.getElementById("guardLoading").style.display = "none";
    document.getElementById("app").style.display = "flex";
}

function updateWelcomeMessage() {
    document.getElementById("welcomeName").textContent = currentAdmin.username;
}

function updateStatistics() {
    const adminCount = allUsers.filter(user =>
        user.role === "admin"
    ).length;

    const renderCount = allUsers.filter (user =>
        user.role === "user"
    ).length;

    document.getElementById("statTotalUsers").textContent = loadUsers.length;
    document.getElementById("statPendingPosts").textContent = createPendingCard.length;
    document.getElementById("statAdmins").textContent = adminCount;
    document.getElementById("statRegularUsers").textContent = readerCount;
}

renderRecentPending();