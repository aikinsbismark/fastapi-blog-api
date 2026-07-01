import { config } from "./config.js";
import { isAuthenticated, removeLocalStorage, getCurrentAuthor } from "../actions/authentication.js";


let currentUser = null;
let token = null;
let allPosts  = [];
let currentFilter = 'all';


async function initializeDashboard() {
    const user = isAuthenticated();

    if (!user) {
        redirectToLogin();
        return;
    }

    token = user.access_token || user.token;

    const author = await getCurrentAuthor(token);

    if (!author) {
        redirectToLogin();
        return;
    }

    currentUser = author;
    showDashboard();
}

function redirecToLogin() {
    window.location.href = "/login.html";
}
initializeDashboard();


function showDashboard() {
    document.getElementById('guardLoading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    renderIcons();
    initSidebar();
    initNav();
    initForm();
    initFilters();
    loadPosts();
}

function initSidebar() {
    const { username } = currentUser;

    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const welcomeName = document.getElementById("welcomeName");
    const logoutButton = document.getElementById("logoutBtn");

    sidebarName.textContent = username;
    sidebarAvatar.textContent = username.slice(0, 2).toUpperCase;
    welcomeName.textContent = username;

    logoutButton.addEventListener('click', () => {
    removeLocalStorage('user');
    window.location.href = '/login.html';
  });
}

function initNav() {
    const navigationItems = document.querySelectorAll('.nav-item');
    const pageViews = document.querySelectorAll('.view');

    function showView(viewName) {

        pageViews.forEach(view => {
            const isActiveView = view.id === `view-${viewName}`;
            view.classList.toggle('active', isActiveView);
        });

        navigationItems.forEach(item => {
            const isActiveLink = item.dataset.view === viewName;
            item.classList.toggle('active', isActiveLink);
        });

        if (viewName === 'compose') {
            resetForm();
        }

        if (viewName === 'analytics') {
            renderAnalytics();
        }
    }

    navigationItems.forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();

            const selectedView = item.dataset.view;
            showView(selectedView);
        });
    });

    document.querySelectorAll('[data-goto]').forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();

            const destination = button.dataset.goto;
            showView(destination);
        });
    });

    window.showView = showView;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${config.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadPosts() {
  try {
    allPosts = await apiFetch('/blog/author/details');
    renderStats();
    renderRecentPosts();
    renderAllPosts();
  } catch (err) {
    console.error('Failed to load posts:', err);
    const message = `
        <div class="empty-state">
            Couldn't load your posts. 
            Check your connection and refresh.
        </div>
    `;
    document.getElementById('recentPostList').innerHTML = message;
    document.getElementById('allPostList').innerHTML = message;
  }
}

function normalizeStatus(status) {
  return status ? status.split('.').pop().toLowerCase() : "";
}
 
const published = config.BLOG_STATUS.PUBLISHED.toLowerCase();
const pending   = config.BLOG_STATUS.PENDING.toLowerCase();
 
function countComments(tree) {
  if (!Array.isArray(tree)) {
    return 0;
  }
  return tree.reduce((sum, comment) => {
    return sum + 1 + 
    countComments(comment.replies);
  }, 0);
}
 
function renderStats() {
  const published = allPosts.filter(post =>
    normalizeStatus(post.status) === PUBLISHED
  );
  const pending   = allPosts.filter(post => 
    normalizeStatus(p.status) === PENDING
  );
  const totalLikes    = allPosts.reduce((sum, post) => {
    return sum + (post.likes_count ?? 0);
  }, 0);
  const totalComments = allPosts.reduce((sum, post) => {
    return sum + countComments(post.comments);
  }, 0);
 
  document.getElementById('statTotal').textContent = allPosts.length;
  document.getElementById('statPublished').textContent = published.length;
  document.getElementById('statPending').textContent = pending.length;
  document.getElementById('statLikes').textContent = totalLikes;
  document.getElementById('statComments').textContent = totalComments;
}

function renderRecentPosts() {
  const container = document.getElementById('recentPostList');
 
  if (allPosts.length === 0) {
    container.innerHTML = `
        <div class="empty-state">
            Nothing written yet. 
            Your posts will appear here once you start writing.
        </div>
    `;
    return;
  }
 
  container.innerHTML = allPosts.slice(0, 5).map(postRowHTML).join('');
  renderIcons(container);
  attachRowActions(container);
}

function initFilters() {
  const filterChips = document.querySelectorAll('.filter-chip');

  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(button => {
        button.classList.remove("acive");
      });
      
      chip.classList.add("active");

      currentFilter = chip.dataset.filter;

      renderAllPosts;
    });
  });
}

function renderAllPosts() {
  const container = document.getElementById('allPostList');
 
  const filtered = currentFilter === 'all'
    ? allPosts
    : allPosts.filter(p => normalizeStatus(p.status) === currentFilter);
 
  if (filtered.length === 0) {
    container.innerHTML = `
        <div class="empty-state">
            No posts with this status.
        </div>
    `;
    return;
  }
 
  container.innerHTML = filtered.map(postRowHTML).join('');
  renderIcons(container);
  attachRowActions(container);
}

function postRowHTML(post) {
  const status = normalizeStatus(post.status);
  const isPending = status === PENDING;
  const commentCount = countComments(post.comments);
 
  return `
    <div class="post-row" data-id="${post.id}">
      <div class="post-row-info">
        <div class="post-row-title">${escapeHtml(post.title)}</div>
        <div class="post-row-meta">
          <span class="status-dot status-dot--${status}"></span>
          ${status === PUBLISHED ? 'Published' : 'Awaiting admin review'}
        </div>
      </div>
      <div class="post-row-stat"><i data-icon="thumb"></i> ${post.likes_count ?? 0}</div>
      <div class="post-row-stat"><i data-icon="chat"></i> ${commentCount}</div>
      <div class="post-row-actions">
        ${isPending ? `<button class="btn-secondary" data-action="edit" data-id="${post.id}">Edit</button>` : ''}
        <button class="btn-danger" data-action="delete" data-id="${post.id}">Delete</button>
      </div>
    </div>
  `;
}
 
function attachRowActions(container) {
  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const postId = parseInt(button.dataset.id);
      
      editPost(postId);
  });
});
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const postId = parseInt(button.dataset.id);

      deletePost(postId);
    });
  });
}

function initForm() {
  document.getElementById('postForm').addEventListener('submit', handleSubmit);
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    resetForm();
    window.__goTo('posts');
  });
}
 
async function handleSubmit(event) {
  event.preventDefault();
 
  const postId    = document.getElementById('postId').value;
  const title     = document.getElementById('postTitle').value.trim();
  const content   = document.getElementById('postContent').value.trim();
  const errorEl   = document.getElementById('formError');
  const successEl = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');
 
  errorEl.classList.remove('visible');
  successEl.classList.remove('visible');
 
  if (!title || !content) {
    errorEl.textContent = 'Title and content are required.';
    errorEl.classList.add('visible');
    return;
  }
 
  submitBtn.disabled = true;
  submitBtn.textContent = postId ? 'Saving…' : 'Submitting…';
 
  try {
    if (postId) {
      await apiFetch(`/blog/update/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content }),
      });
      successEl.textContent = 'Post updated.';
    } else {
      await apiFetch('/blog/create', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      successEl.textContent = 'Post submitted! It will appear once the admin publishes it.';
    }
 
    successEl.classList.add('visible');
    e.target.reset();
    document.getElementById('postId').value = '';
    await loadPosts();
 
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to save post. Please try again.';
    errorEl.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = postId ? 'Save changes' : 'Submit for review';
  }
}
 
function editPost(id) {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
 
  document.getElementById('postId').value = post.id;
  document.getElementById('postTitle').value = post.title;
  document.getElementById('postContent').value = post.content;
 
  document.getElementById('composeHeading').textContent = 'Edit post';
  document.getElementById('composeSub').textContent = 'Your changes are saved immediately — this post is still pending review.';
  document.getElementById('submitBtn').textContent = 'Save changes';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
 
  window.goTo('compose');
}
 
function resetForm() {
  document.getElementById('postForm').reset();
  document.getElementById('postId').value = '';
  document.getElementById('composeHeading').textContent = 'Write a new post';
  document.getElementById('composeSub').textContent = "It will be sent to the admin for review before it's published.";
  document.getElementById('submitBtn').textContent = 'Submit for review';
  document.getElementById('cancelEditBtn').classList.add('hidden');
  document.getElementById('formError').classList.remove('visible');
  document.getElementById('formSuccess').classList.remove('visible');
}

async function deletePost(id) {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
 
  const isLive = normalizeStatus(post.status) === PUBLISHED;
  const warning = isLive
    ? 'This post is live. Delete it permanently?'
    : 'Delete this post permanently?';
 
  if (!confirm(warning)) return;
 
  try {
    await apiFetch(`/blog/delete/${id}`, { method: 'DELETE' });
    await loadPosts();
  } catch (err) {
    alert(err.message || 'Failed to delete post.');
  }
}


function renderAnalytics() {
  const published = allPosts.filter(p => normalizeStatus(p.status) === PUBLISHED);
 
  const totalLikes    = published.reduce((sum, p) => sum + (p.likes_count ?? 0), 0);
  const totalComments = published.reduce((sum, p) => sum + countComments(p.comments), 0);
 
  document.getElementById('anaPublished').textContent = published.length;
  document.getElementById('anaLikes').textContent = totalLikes;
  document.getElementById('anaComments').textContent = totalComments;
 
  renderBarList('likesBarList', published, p => p.likes_count ?? 0, 'bar-row__fill--likes');
  renderBarList('commentsBarList', published, p => countComments(p.comments), 'bar-row__fill--comments');
}
 
function renderBarList(containerId, posts, getValue, fillClass) {
  const container = document.getElementById(containerId);
 
  if (posts.length === 0) {
    container.innerHTML = `<div class="empty-state">No published posts yet.</div>`;
    return;
  }
 
  const sorted = posts.slice().sort((a, b) => getValue(b) - getValue(a));
  const max = Math.max(...sorted.map(getValue), 1);
 
  container.innerHTML = sorted.map(p => {
    const val = getValue(p);
    return `
      <div class="bar-row">
        <div class="bar-row__label" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
        <div class="bar-row__track"><div class="bar-row__fill ${fillClass}" style="width:${(val / max * 100).toFixed(1)}%"></div></div>
        <div class="bar-row__val">${val}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

