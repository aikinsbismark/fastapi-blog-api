import { config } from "../../config.js";
import { isAuthenticated, getCurrentAdmin } from "../../../actions/authentication.js";
import { initializeRoleFilter, loadUsers, setUsersToken } from "./users.js";
import { loadPendingBlogs, renderRecentPending, setPendingToken } from "./pending-posts.js";


let currentAdmin = null;
let token = null;

export async function initializeDashboard() {
    const session = isAuthenticated();

    if (!session) {
        window.location.href ="/login.html";
        return;
    }

    token = session.access_token || session.token;

    currentAdmin = await getCurrentAdmin(token);

    if (!currentAdmin) {
        window.location.href = "/login.html";
        return;
    }

    setUsersToken(token);
    setPendingToken(token);
    initializeRoleFilter();
    showDashboard();
    await loadDashboard();
}

async function loadDashboard() {
    try {
        const [users, pendingBlogs] = await Promise.all([loadUsers(), loadPendingBlogs()]);

        updateWelcomeMessage();
        updateStatistics(users, pendingBlogs);
        renderRecentPending(pendingBlogs);

    } catch (error) {
        console.error("Dashboard failed to load:", error);
    }
}

function showDashboard() {
    document.getElementById("guardLoading").style.display = "none";
    document.getElementById("app").style.display = "flex";
}

function updateWelcomeMessage() {
    document.getElementById("welcomeName").textContent = currentAdmin.username;
}

function updateStatistics(users, pendingBlogs) {
    const adminCount = users.filter(user =>
        user.role === "admin"
    ).length;

    const readerCount = users.filter(user =>
        user.role === "user"
    ).length;

    document.getElementById("statTotalUsers").textContent = users.length;
    document.getElementById("statPendingPosts").textContent = pendingBlogs.length;
    document.getElementById("statAdmins").textContent = adminCount;
    document.getElementById("statRegularUsers").textContent = readerCount;
}