import { initializeDashboard } from "./dashboard.js";
import { initializeNavigation } from "./navigation.js";
import { initializePendingPosts } from "./pending-posts.js";
import { initializePublishPage } from "./published-posts.js";
import { loadUsers } from "./users.js";


async function bootstrapAdmin() {
    try {
        await initializeDashboard();

        initializeNavigation();

        await Promise.all([
            initializePendingPosts(), 
            initializePublishPage(), 
            loadUsers(),
        ]);

    } catch (error) {
        console.error("Admin dashboard failed to boot:", error);
    }
}

document.addEventListener("DOMContentLoaded", bootstrapAdmin);