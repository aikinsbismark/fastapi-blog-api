import { config } from '../js/config.js';
import { isAuthenticated, getCurrentAuthor, removeLocalStorage } from '../js/auth.js';



let currentFilter = ""; 
let allBlogs = []; 
let authToken = null;

function extractToken(storedUser) {
  return (
    storedUser?.access_token ||
    storedUser?.token ||
    storedUser?.jwt ||
    null
  );
}

export async function getAPI() {
    const response = await fetch(`${config.API_BASE_URL}/blog/author/details`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${getCurrentAuthor()}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Could not load post: ${response.status}`);
    }

    return response.json();
}

function countComments(comments) {
  if (!comments || !comments.length) {
    return 0;
  }

  return comments.reduce((sum, count) => sum + 1 + countComments(count.replies || []), 0);
}

function renderStats(blogs) {
  const isPublished = (blog) => String(blog.status).toUpperCase().includes(config.BLOG_STATUS.PUBLISHED);
  const isPending = (blog) => String(blog.status).toUpperCase().includes(config.BLOG_STATUS.PENDING);

  const totalLikes = blogs.reduce((sum, blog) => sum + (blog.likes_count || 0), 0);
  const totalComments = blogs.reduce((sum, blog) => sum + countComments(blog.comments), 0);

  document.getElementById("stat-total").textContent = blogs.length;
  document.getElementById("stat-published").textContent = blogs.filter(isPublished).length;
  document.getElementById("stat-pending").textContent = blogs.filter(isPending).length;
  document.getElementById("stat-likes").textContent = totalLikes;
  document.getElementById("stat-comments").textContent = totalComments;
}

function statusBadge(status) {
  const isPublished = String(status).toUpperCase().includes(config.BLOG_STATUS.PUBLISHED);
  return isPublished
    ? `<span class="badge published">Published</span>`
    : `<span class="badge pending">Pending</span>`;
}

function renderRows(blogs) {
  const tbody = document.getElementById("blog-rows");
  const message = document.getElementById("status-msg");
  tbody.innerHTML = "";

  if (!blogs.length) {
    message.innerHTML = `<div class="empty">No posts here yet.</div>`;
    return;
  }
  message.innerHTML = "";

  for (const blog of blogs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(blog.title)}</td>
      <td>${statusBadge(blog.status)}</td>
      <td>${blog.likes_count}</td>
      <td>${countComments(blog.comments)}</td>
      <td class="row-actions">
        <a class="edit" href="edit.html?id=${blog.id}">Edit</a>
        <button class="comments" data-id="${blog.id}" data-title="${escapeHtml(blog.title)}">Comments</button>
        <button class="delete" data-id="${blog.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function applyFilterAndRender() {
  const filtered = currentFilter
    ? allBlogs.filter((blog) => String(blog.status).toUpperCase().includes(currentFilter))
    : allBlogs;
  renderRows(filtered);
}

async function loadDashboard() {
  const message = document.getElementById("status-msg");

  message.innerHTML = `<div class="loading">Loading your posts…</div>`;
  try {
    allBlogs = await getAPI();

    renderStats(allBlogs);

    applyFilterAndRender();
  } catch (error) {
    console.error("Error", error);
  }
}

async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this post? This action can't be undone.")) {
    return;
  }

  try {
    await apiDelete(`/blog/delete/${id}`);

    loadDashboard();
  } catch (error) {
    alert("Failed to delete post.");
    console.error(error);
  }
}

function commentHtml(comment) {
  const author = comment.author_name || comment.username || "Anonymous";
  const body = comment.content || comment.text || "";
  const replies = comment.replies && comment.replies.length
    ? `<div class="replies">${comment.replies.map(commentHtml).join("")}</div>`
    : "";
  return `
    <div class="comment-item">
      <div class="meta">${escapeHtml(author)}</div>
      <div>${escapeHtml(body)}</div>
      ${replies}
    </div>
  `;
}

function handleViewComments(id, title) {
  const blog = allBlogs.find((blog) => String(blog.id) === String(id));
  const body = document.getElementById("comments-body");
  document.getElementById("comments-title").textContent = `Comments — ${title}`;

  const comments = (blog && blog.comments) || [];
  body.innerHTML = comments.length
    ? comments.map(commentHtml).join("")
    : `<div class="empty">No comments yet.</div>`;

  document.getElementById("comments-modal").classList.add("open");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function guardAndInit() {
  const stored = isAuthenticated();
  if (!stored) {
    window.location.href = "/login.html";
    return;
  }

  authToken = extractToken(stored);

  const author = await getCurrentAuthor(authToken);
  if (!author) {
    removeLocalStorage("user");
    window.location.href = "/login.html";
    return;
  }

  const nameElement = document.getElementById("author-name");
  if (nameElement) nameElement.textContent = author.username || author.name || "";

  loadDashboard();
}

document.addEventListener("click", (event) => {
  const id = event.target.dataset.id;
  if (event.target.classList.contains("delete")) handleDelete(id);
  if (event.target.classList.contains("comments")) handleViewComments(id, event.target.dataset.title);
});

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("comments-modal").classList.remove("open");
});
document.getElementById("comments-modal").addEventListener("click", (event) => {
  if (event.target.id === "comments-modal") event.currentTarget.classList.remove("open");
});

document.querySelectorAll("#filters button").forEach((clickedButton) => {
  clickedButton.addEventListener("click", () => {
    document.querySelectorAll("#filters button").forEach((filterButton) => {
      filterButton.classList.remove("active");
    });

    clickedButton.classList.add("active");

    currentFilter = clickedButton.dataset.filter;
    applyFilterAndRender();
  });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  removeLocalStorage("user");
  window.location.href = "/login.html";
});

document.addEventListener("DOMContentLoaded", guardAndInit);