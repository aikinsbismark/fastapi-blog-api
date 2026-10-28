import { config } from "./config.js";
import { getCurrentUser, logout } from "../actions/guard.js";



const LOGIN_PAGE = "/static/templates/login.html";


const HEART_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`;

const COMMENT_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`;


const page = {
  spinner: document.getElementById("loadingSpinner"),
  alertBox: document.getElementById("alertContainer"),
  listPage: document.getElementById("blogs-page"),
  blogList: document.getElementById("blogs-list"),
  searchBox: document.getElementById("searchInput"),
  detailPage: document.getElementById("blog-detail-page"),
  blogContent: document.getElementById("blog-content"),
  backButton: document.getElementById("backToBlogsBtn"),
  logoutButton: document.getElementById("logoutBtn"),
};

function makeTextSafe(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function waitForPause(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function showSpinner(visible) {
  page.spinner.style.display = visible ? "" : "none";
}

function showMessage(text, type = "danger") {
  page.alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${makeTextSafe(text)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function goToLogin() {
  window.location.href = LOGIN_PAGE;
}

function getToken() {
  try {
    const saved = JSON.parse(localStorage.getItem("user"));
    if (!saved) return null;
    return saved.access_token || saved.token || null;
  } catch {
    return null;
  }
}

async function getFromApi(path, params = {}) {
  const url = new URL(config.API_BASE_URL + path);

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }
  return response.json();
}

async function postToApi(path, body) {
  const token = getToken();
  if (!token) {
    goToLogin();
    return null;
  }

  const response = await fetch(config.API_BASE_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem("user");
    goToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }
  return response.json();
}

const api = {
  getBlogs: (search) => getFromApi("/blog/", { search }),
  getBlog: (id) => getFromApi("/blog/" + id),
  likeBlog: (id) => postToApi("/like/blog/" + id),
  getComments: (id) => getFromApi("/comment/" + id),
  addComment: (id, content, parentId = null) =>
    postToApi("/comment/" + id, { content, parent_id: parentId }),
};


function showOrHide(selector, shouldShow) {
  document.querySelectorAll(selector).forEach((element) => {
    element.style.display = shouldShow ? "" : "none";
  });
}

function updateMenu() {
  const user = getCurrentUser();
  const isLoggedIn = Boolean(user);
  const role = user ? user.role : null;

  showOrHide(".guest-only", !isLoggedIn);
  showOrHide(".authenticated", isLoggedIn);
  showOrHide(".author-only", role === "author");
  showOrHide(".admin-only", role === "admin");
}

const loadedBlogs = {};


function getPictureUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return config.API_BASE_URL + path;
}

function buildLetterCircle(name) {
  return `
    <span class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center"
          style="width: 32px; height: 32px; font-size: 14px;">
      ${makeTextSafe(name.charAt(0).toUpperCase())}
    </span>`;
}

function buildAuthor(author) {
  if (!author) return "";

  const name = author.username || "Unknown";
  const pictureUrl = getPictureUrl(author.image_path);

  let avatar;
  if (pictureUrl) {
    avatar = `
      <img src="${makeTextSafe(pictureUrl)}" alt="" class="rounded-circle author-avatar"
           data-name="${makeTextSafe(name)}"
           width="32" height="32" style="object-fit: cover;">`;
  } else {
    avatar = buildLetterCircle(name);
  }

  return `
    <div class="d-flex align-items-center gap-2 mb-2">
      ${avatar}
      <span class="fw-semibold">${makeTextSafe(name)}</span>
    </div>
  `;
}

function buildBlogCard(blog) {
  const preview = (blog.content || "").slice(0, 120);
  const likes = blog.likes_count || 0;

  return `
    <div class="col-md-4 mb-3">
      <div class="card h-100">
        <div class="card-body">
          ${buildAuthor(blog.author)}
          <h5 class="card-title">${makeTextSafe(blog.title)}</h5>
          <p class="card-text">${makeTextSafe(preview)}...</p>

          <div class="d-flex flex-wrap align-items-center gap-2">
            <button class="btn btn-primary btn-sm open-blog" data-id="${blog.id}">
              Read more
            </button>

            <button class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 like-button"
                    data-id="${blog.id}">
              ${HEART_ICON}
              <span class="like-count">${likes}</span>
            </button>

            <button class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 open-blog"
                    data-id="${blog.id}" data-go-to-comments="true">
              ${COMMENT_ICON}
              <span class="comment-count" data-blog-id="${blog.id}">${blog.comments_count ?? ""}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadBlogs(searchText = "") {
  showSpinner(true);
  try {
    const data = await api.getBlogs(searchText);
    const blogs = data.blogs || [];
    blogs.forEach((blog) => {
      loadedBlogs[blog.id] = blog;
    });

    if (blogs.length === 0) {
      page.blogList.innerHTML = `<p class="text-muted">No blogs found.</p>`;
    } else {
      page.blogList.innerHTML = blogs.map(buildBlogCard).join("");
    }
  } catch (error) {
    showMessage("Couldn't load blogs right now.");
    console.error("loadBlogs failed:", error);
  } finally {
    showSpinner(false);
  }
}

function showListPage() {
  page.detailPage.style.display = "none";
  page.listPage.style.display = "";
  loadBlogs(page.searchBox ? page.searchBox.value : ""); // refresh the like counts
}

function showDetailPage() {
  page.listPage.style.display = "none";
  page.detailPage.style.display = "";
}

async function getLikeCount(blogId) {
  const data = await api.getBlogs("");
  const blogs = data.blogs || [];
  const blog = blogs.find((item) => String(item.id) === String(blogId));
  return blog ? blog.likes_count : 0;
}

async function handleLikeClick(button) {
  const blogId = button.dataset.id;
  button.disabled = true; 

  try {
    const result = await api.likeBlog(blogId);
    if (result === null) return; 

    const newCount = await getLikeCount(blogId);
    const counters = document.querySelectorAll(
      `.like-button[data-id="${blogId}"] .like-count`
    );
    counters.forEach((counter) => {
      counter.textContent = newCount;
    });
  } catch (error) {
    showMessage("Couldn't update your like.");
    console.error("like failed:", error);
  } finally {
    button.disabled = false;
  }
}

function buildComment(comment) {
  const replies = (comment.children || []).map(buildComment).join("");
  const date = new Date(comment.created_at).toLocaleString();

  return `
    <div class="border-start ps-3 mb-3">
      <small class="text-muted">User #${comment.user_id} · ${makeTextSafe(date)}</small>
      <p class="mb-1">${makeTextSafe(comment.content)}</p>
      <button type="button" class="btn btn-link btn-sm p-0 reply-button"
              data-comment-id="${comment.id}">Reply</button>
      <div class="reply-form-box mt-2" data-for="${comment.id}"></div>
      ${replies}
    </div>
  `;
}

function countComments(comments) {
  let total = 0;
  for (const comment of comments) {
    total += 1 + countComments(comment.children || []);
  }
  return total;
}

function updateCommentCount(blogId, total) {
  const counters = document.querySelectorAll(
    `.comment-count[data-blog-id="${blogId}"]`
  );
  counters.forEach((counter) => {
    counter.textContent = total;
  });
}

async function loadComments(blogId) {
  const commentsBox = document.getElementById("commentsList");
  const comments = await api.getComments(blogId);
  updateCommentCount(blogId, countComments(comments));

  if (comments.length === 0) {
    commentsBox.innerHTML = `<p class="text-muted">No comments yet.</p>`;
  } else {
    commentsBox.innerHTML = comments.map(buildComment).join("");
  }
}

function scrollToComments() {
  document.getElementById("commentsSection").scrollIntoView({ behavior: "smooth" });
}

async function handleCommentSubmit(event, blogId) {
  event.preventDefault();

  const textBox = document.getElementById("commentText");
  const text = textBox.value.trim();
  if (!text) return;

  try {
    const result = await api.addComment(blogId, text);
    if (result === null) return; 

    textBox.value = "";
    await loadComments(blogId);
  } catch (error) {
    showMessage("Couldn't post your comment.");
    console.error("comment failed:", error);
  }
}


function toggleReplyForm(button) {
  const commentId = button.dataset.commentId;
  const box = document.querySelector(`.reply-form-box[data-for="${commentId}"]`);

  if (box.innerHTML) {
    box.innerHTML = ""; 
    return;
  }

  box.innerHTML = `
    <form class="reply-form" data-parent-id="${commentId}">
      <textarea class="form-control mb-2" rows="2" placeholder="Write a reply..." required></textarea>
      <button type="submit" class="btn btn-primary btn-sm">Post reply</button>
    </form>
  `;
  box.querySelector("textarea").focus();
}

async function handleReplySubmit(form) {
  const blogId = page.blogContent.dataset.blogId;
  const parentId = Number(form.dataset.parentId);
  const text = form.querySelector("textarea").value.trim();
  if (!text) return;

  try {
    const result = await api.addComment(blogId, text, parentId);
    if (result === null) return; 
    await loadComments(blogId);
  } catch (error) {
    showMessage("Couldn't post your reply.");
    console.error("reply failed:", error);
  }
}

async function openBlog(blogId, goToComments = false) {
  showSpinner(true);
  try {
    const blog = await api.getBlog(blogId);
    page.blogContent.dataset.blogId = blogId; 

    let likes = blog.likes_count;
    if (likes === undefined) {
      likes = await getLikeCount(blogId);
    }

    const author = blog.author || (loadedBlogs[blogId] && loadedBlogs[blogId].author);

    page.blogContent.innerHTML = `
      <h2>${makeTextSafe(blog.title)}</h2>
      ${buildAuthor(author)}
      <p>${makeTextSafe(blog.content)}</p>

      <div class="d-flex align-items-center gap-2 my-3">
        <button class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 like-button"
                data-id="${blogId}">
          ${HEART_ICON}
          <span class="like-count">${likes}</span>
        </button>

        <button id="jumpToComments" type="button"
                class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
          ${COMMENT_ICON}
          <span class="comment-count" data-blog-id="${blogId}"></span>
        </button>
      </div>

      <hr>

      <section id="commentsSection">
        <h5>Comments</h5>

        <form id="commentForm" class="mb-3">
          <textarea id="commentText" class="form-control mb-2" rows="2"
                    placeholder="Write a comment..." required></textarea>
          <button type="submit" class="btn btn-primary btn-sm">Post comment</button>
        </form>

        <div id="commentsList"></div>
      </section>
    `;

    document.getElementById("jumpToComments").addEventListener("click", () => {
      scrollToComments();
      document.getElementById("commentText").focus();
    });

    document.getElementById("commentForm").addEventListener("submit", (event) => {
      handleCommentSubmit(event, blogId);
    });

    await loadComments(blogId);
    showDetailPage();

    if (goToComments) scrollToComments();
  } catch (error) {
    showMessage("Couldn't load that blog post.");
    console.error("openBlog failed:", error);
  } finally {
    showSpinner(false);
  }
}


function setUpEvents() {
  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (image.tagName === "IMG" && image.classList.contains("author-avatar")) {
        image.outerHTML = buildLetterCircle(image.dataset.name || "?");
      }
    },
    true
  );

  page.blogList.addEventListener("click", (event) => {
    const likeButton = event.target.closest(".like-button");
    if (likeButton) {
      handleLikeClick(likeButton);
      return;
    }

    const openButton = event.target.closest(".open-blog");
    if (openButton) {
      const goToComments = openButton.dataset.goToComments === "true";
      openBlog(openButton.dataset.id, goToComments);
    }
  });

  page.blogContent.addEventListener("click", (event) => {
    const likeButton = event.target.closest(".like-button");
    if (likeButton) {
      handleLikeClick(likeButton);
      return;
    }

    const replyButton = event.target.closest(".reply-button");
    if (replyButton) toggleReplyForm(replyButton);
  });


  page.blogContent.addEventListener("submit", (event) => {
    const form = event.target.closest(".reply-form");
    if (!form) return;
    event.preventDefault();
    handleReplySubmit(form);
  });

  if (page.backButton) {
    page.backButton.addEventListener("click", showListPage);
  }

  if (page.searchBox) {
    page.searchBox.addEventListener(
      "input",
      waitForPause((event) => loadBlogs(event.target.value), 300)
    );
  }

  if (page.logoutButton) {
    page.logoutButton.addEventListener("click", logout);
  }
}

function start() {
  updateMenu();
  setUpEvents();
  loadBlogs();
}

document.addEventListener("DOMContentLoaded", start);