import { initDashboardPage } from "./dashboard";
import { initCreatePage } from "./create-blog";
import { initEditPage } from "./edit-blog";



document.addEventListener("DOMContentLoaded", () => {
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