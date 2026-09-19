import { initDashboardPage, loadDashboard } from "./dashboard.js";
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
  }

  document.getElementById("guardLoading").style.display = "none";
  app.style.display = "flex";

  wireNavigation();
  await initComposePage(loadDashboard); 
  await initDashboardPage();

  const postId = new URLSearchParams(window.location.search).get("id");
  if (postId) {
    showView("compose");
    startEditPost(postId);
  }
});