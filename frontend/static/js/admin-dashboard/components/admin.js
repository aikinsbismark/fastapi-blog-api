import { initializeDashboard } from "./dashboard.js";
import { initializeNavigation } from "./navigation.js";


async function bootstrapAdmin() {
    try {
        await initializeDashboard();

        initializeNavigation();

    } catch (error) {
        console.error("Admin dashboard failed to boot:", error);
    }
}

document.addEventListener("DOMContentLoaded", bootstrapAdmin);