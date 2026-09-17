import { initDashboardPage } from "./dashboard.js";
import { initCreatePage } from "./create-blog.js";
import { initEditPage } from "./edit-blog.js";
import { getAuthorSession } from "./author-session.js";



document.addEventListener("DOMContentLoaded", async () => {
    const app = document.getElementById("app");

    if (app) {
        const session = await getAuthorSession();
        if (!session) {
            return;
        }

        document.getElementById("guardLoading").style.display = "none";
        app.style.display = "flex";
    }

    if (document.getElementById("blog-rows")) {
        initDashboardPage();
        return;
    }

    if (document.getElementById("postForm")) {
        const isEditPage = new URLSearchParams(window.location.search).has("id") ||
        window.location.pathname.includes("edit");

        isEditPage ? initEditPage() : initCreatePage();
    }
});