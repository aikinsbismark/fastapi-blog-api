import { initDashboardPage } from "./dashboard.js";
import { initComposePage, startNewPost, startEditPost } from "./edit-blog.js";
import { getAuthorSession } from "./author-session.js";
import { showView } from "./view-router.js";

function wireNavigation() {
  document.querySelectorAll("[data-view]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      showView(element.dataset.view);
      if (element.dataset.view === "compose") startNewPost();
    });
  });

  document.querySelectorAll("[data-goto]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      showView(element.dataset.goto);
      if (element.dataset.goto === "compose") startNewPost();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");
  if (!app) {
    return;
  }

  const session = await getAuthorSession();
  if (!session) {
    return;
  }import { initDashboardPage } from "./dashboard.js";
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

  document.getElementById("guardLoading").style.display = "none";
  app.style.display = "flex";

  wireNavigation();
  await initComposePage(); 
  await initDashboardPage();

  const postId = new URLSearchParams(window.location.search).get("id");
  if (postId) {
    showView("compose");
    startEditPost(postId);
  }
});