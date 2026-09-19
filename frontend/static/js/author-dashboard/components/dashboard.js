import { getAuthorSession, countComments, api, removeLocalStorage } from "./author-session.js";
import { config } from "../../config.js";
import { renderPostList, wirePostActions } from "./delete-blog.js";
import { startEditPost } from "./edit-blog.js";
import { showView } from "./view-router.js";

const RECENT_POSTS_LIMIT = 5;

let currentFilter = "all";
let allBlogs = [];
let authorToken = null;

function isPublished(blog) {
  return String(blog.status).toUpperCase().includes(config.BLOG_STATUS.PUBLISHED);
}

function isPending(blog) {
  return String(blog.status).toUpperCase().includes(config.BLOG_STATUS.PENDING);
}

function renderStats(blogs) {
  const totalLikes = blogs.reduce((sum, b) => sum + (b.likes_count || 0), 0);
  const totalComments = blogs.reduce((sum, b) => sum + countComments(b.comments), 0);

  document.getElementById("statTotal").textContent = blogs.length;
  document.getElementById("statPublished").textContent = blogs.filter(isPublished).length;
  document.getElementById("statPending").textContent = blogs.filter(isPending).length;
  document.getElementById("statLikes").textContent = totalLikes;
  document.getElementById("statComments").textContent = totalComments;
}

function renderRecentPosts(blogs) {
  const recent = [...blogs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, RECENT_POSTS_LIMIT);
  renderPostList(document.getElementById("recentPostList"), recent);
}

function renderAllPosts() {
  const filtered =
    currentFilter === "all"
      ? allBlogs
      : allBlogs.filter((b) => (currentFilter === "published" ? isPublished(b) : isPending(b)));
  renderPostList(document.getElementById("allPostList"), filtered);
}

export async function loadDashboard() {
  try {
    allBlogs = await api.getAuthorPosts(authorToken);
    renderStats(allBlogs);
    renderRecentPosts(allBlogs);
    renderAllPosts();
  } catch (error) {
    console.error("loadDashboard failed:", error);
  }
}

async function handleDelete(id) {
  await api.deletePost(authorToken, id);
  await loadDashboard();
}

function handleEdit(id) {
  showView("compose");
  startEditPost(id);
}

function wireFilterChips() {
  document.querySelectorAll("#filterRow .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#filterRow .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter;
      renderAllPosts();
    });
  });
}

export async function initDashboardPage() {
  const session = await getAuthorSession();
  if (!session) return;

  authorToken = session.token;

  const displayName = session.author.username || session.author.name || "";
  document.getElementById("welcomeName").textContent = displayName;
  document.getElementById("sidebarName").textContent = displayName;
  document.getElementById("sidebarAvatar").textContent = (displayName || "?")[0].toUpperCase();

  await loadDashboard();

  wirePostActions(document.getElementById("recentPostList"), { onEdit: handleEdit, onDelete: handleDelete });
  wirePostActions(document.getElementById("allPostList"), { onEdit: handleEdit, onDelete: handleDelete });

  wireFilterChips();

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    removeLocalStorage("user");
    window.location.href = "/login.html";
  });
}