import { config } from "./config.js";
import { getCurrentUser, logout } from "../actions/guard.js";



const dom = {
  loadingSpinner: document.getElementById("loadingSpinner"),
  alertContainer: document.getElementById("alertContainer"),
  blogsPage: document.getElementById("blogs-page"),
  blogsList: document.getElementById("blogs-list"),
  searchInput: document.getElementById("searchInput"),
  blogDetailPage: document.getElementById("blog-detail-page"),
  blogContent: document.getElementById("blog-content"),
  backToBlogsBtn: document.getElementById("backToBlogsBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
};

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function showLoading(isLoading) {
  dom.loadingSpinner.style.display = isLoading ? "" : "none";
}

function showAlert(message, type = "danger") {
  dom.alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

async function apiGet(path, params = {}) {
  const url = new URL(`${config.API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

const api = {
  listBlogs: (search) => apiGet("/blog/", { search }),
  getBlog: (id) => apiGet(`/blog/${id}`),
};

function toggleGroup(selector, shouldShow) {
  document.querySelectorAll(selector).forEach((el) => {
    el.style.display = shouldShow ? "" : "none";
  });
}

function updateNavForUser() {
  const user = getCurrentUser();
  const role = user?.role;

  toggleGroup(".guest-only", !user);
  toggleGroup(".authenticated", Boolean(user));
  toggleGroup(".author-only", role === "author");
  toggleGroup(".admin-only", role === "admin");
}

function blogCardHtml(blog) {
  const excerpt = (blog.content || "").slice(0, 120);
  return `
    <div class="col-md-4 mb-3">
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(blog.title)}</h5>
          <p class="card-text">${escapeHtml(excerpt)}...</p>
          <button class="btn btn-primary btn-sm view-blog" data-id="${blog.id}">Read more</button>
        </div>
      </div>
    </div>
  `;
}

async function loadBlogsList(searchTerm = "") {
  showLoading(true);
  try {
    const blogs = await api.listBlogs(searchTerm);
    dom.blogsList.innerHTML = blogs.length
      ? blogs.map(blogCardHtml).join("")
      : `<p class="text-muted">No blogs found.</p>`;
  } catch (error) {
    showAlert("Couldn't load blogs right now.");
    console.error("loadBlogsList failed:", error);
  } finally {
    showLoading(false);
  }
}

function showBlogsList() {
  dom.blogDetailPage.style.display = "none";
  dom.blogsPage.style.display = "";
}

function showBlogDetailPage() {
  dom.blogsPage.style.display = "none";
  dom.blogDetailPage.style.display = "";
}

async function openBlogDetail(id) {
  showLoading(true);
  try {
    const blog = await api.getBlog(id);
    dom.blogContent.innerHTML = `
      <h2>${escapeHtml(blog.title)}</h2>
      <p>${escapeHtml(blog.content)}</p>
    `;
    showBlogDetailPage();
  } catch (error) {
    showAlert("Couldn't load that blog post.");
    console.error("openBlogDetail failed:", error);
  } finally {
    showLoading(false);
  }
}

function bindEvents() {
  dom.blogsList.addEventListener("click", (event) => {
    const button = event.target.closest(".view-blog");
    if (button) openBlogDetail(button.dataset.id);
  });

  dom.backToBlogsBtn?.addEventListener("click", showBlogsList);

  dom.searchInput?.addEventListener(
    "input",
    debounce((event) => loadBlogsList(event.target.value), 300)
  );

  dom.logoutBtn?.addEventListener("click", logout);
}

function init() {
  updateNavForUser();
  bindEvents();
  loadBlogsList();
}

document.addEventListener("DOMContentLoaded", init);