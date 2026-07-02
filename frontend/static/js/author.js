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

    const postList = document.getElementById("allPostList");

    const postsToDisplay = getFilteredPosts();

    if (postsToDisplay.length === 0) {
        showEmptyPostState(postList);
        return;
    }

    postList.innerHTML = postsToDisplay
        .map(createPostRow)
        .join("");

    renderIcons(postList);
    attachRowActions(postList);

}

function getFilteredPosts() {

    if (currentFilter === "all") {
        return allPosts;
    }

    return allPosts.filter(post => {
        return normalizeStatus(post.status) === currentFilter;
    });

}

function showEmptyPostState(container) {

    container.innerHTML = `
        <div class="empty-state">
            No posts with this status.
        </div>
    `;

}

function createPostRow(post) {
    return postRowHTML(post);
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

    const editButtons = container.querySelectorAll('[data-action="edit"]');
    const deleteButtons = container.querySelectorAll('[data-action="delete"]');

    editButtons.forEach(button => {
        button.addEventListener("click", () => {

            const postId = Number(button.dataset.id);

            editPost(postId);

        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener("click", () => {

            const postId = Number(button.dataset.id);

            deletePost(postId);

        });
    });

}

function initForm() {

    const postForm = document.getElementById("postForm");
    const cancelEditButton = document.getElementById("cancelEditBtn");

    postForm.addEventListener("submit", handleSubmit);
    cancelEditButton.addEventListener("click", handleCancelEdit);

}

function handleCancelEdit() {

    resetForm();
    goTo("posts");

}

async function handleSubmit(event) {

    event.preventDefault();

    const form = event.target;

    const postId = document.getElementById("postId").value;
    const titleInput = document.getElementById("postTitle");
    const contentInput = document.getElementById("postContent");

    const errorMessage = document.getElementById("formError");
    const successMessage = document.getElementById("formSuccess");
    const submitButton = document.getElementById("submitBtn");

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    hideMessages(errorMessage, successMessage);

    if (!isValidPost(title, content)) {
        showError(errorMessage, "Title and content are required.");
        return;
    }

    setSubmitButtonState(submitButton, true, postId);

    try {

        await savePost(postId, title, content);

        showSuccess(successMessage, postId);

        form.reset();
        document.getElementById("postId").value = "";

        await loadPosts();

    } catch (error) {

        showError(
            errorMessage,
            error.message || "Failed to save post. Please try again."
        );

    } finally {

        setSubmitButtonState(submitButton, false, postId);

    }

}
 
function editPost(postId) {

    const selectedPost = findPostById(postId);

    if (!selectedPost) {
        return;
    }

    populateEditForm(selectedPost);
    updateEditMode();

    goTo("compose");

}

function findPostById(postId) {

    return allPosts.find(post => post.id === postId);

}

function populateEditForm(post) {

    const postIdInput = document.getElementById("postId");
    const titleInput = document.getElementById("postTitle");
    const contentInput = document.getElementById("postContent");

    postIdInput.value = post.id;
    titleInput.value = post.title;
    contentInput.value = post.content;

}

function updateEditMode() {

    const heading = document.getElementById("composeHeading");
    const subtitle = document.getElementById("composeSub");
    const submitButton = document.getElementById("submitBtn");
    const cancelButton = document.getElementById("cancelEditBtn");

    heading.textContent = "Edit Post";

    subtitle.textContent =
        "Your changes will be saved and sent for review.";

    submitButton.textContent = "Save Changes";

    cancelButton.classList.remove("hidden");

}
 
function resetForm() {

    const postForm = document.getElementById("postForm");
    const postIdInput = document.getElementById("postId");

    const heading = document.getElementById("composeHeading");
    const subtitle = document.getElementById("composeSub");

    const submitButton = document.getElementById("submitBtn");
    const cancelButton = document.getElementById("cancelEditBtn");

    const errorMessage = document.getElementById("formError");
    const successMessage = document.getElementById("formSuccess");

    postForm.reset();
    postIdInput.value = "";

    heading.textContent = "Write a New Post";

    subtitle.textContent =
        "It will be sent to the admin for review before it's published.";

    submitButton.textContent = "Submit for Review";

    cancelButton.classList.add("hidden");

    errorMessage.classList.remove("visible");
    successMessage.classList.remove("visible");

}

async function deletePost(postId) {

    const post = allPosts.find(post => post.id === postId);

    if (!post) {
        return;
    }

    const confirmationMessage = getDeleteConfirmation(post);

    const confirmed = confirm(confirmationMessage);

    if (!confirmed) {
        return;
    }

    try {

        await apiFetch(`/blog/delete/${postId}`, {
            method: "DELETE"
        });

        await loadPosts();

    } catch (error) {

        alert(
            error.message ||
            "Failed to delete post."
        );

    }

}

function renderAnalytics() {

    const publishedPosts = getPublishedPosts();

    const statistics = calculateAnalytics(publishedPosts);

    updateAnalyticsCards(statistics);

    renderBarList(
        "likesBarList",
        publishedPosts,
        post => post.likes_count ?? 0,
        "bar-row__fill--likes"
    );

    renderBarList(
        "commentsBarList",
        publishedPosts,
        post => countComments(post.comments),
        "bar-row__fill--comments"
    );

}
 
function renderBarList(containerId, posts, getValue, fillClass) {

    const container = document.getElementById(containerId);

    if (posts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No published posts yet.
            </div>
        `;

        return;

    }

    const sortedPosts = [...posts].sort((firstPost, secondPost) => {
        return getValue(secondPost) - getValue(firstPost);
    });

    const maximumValue = Math.max(
        ...sortedPosts.map(getValue),
        1
    );

    container.innerHTML = sortedPosts
        .map(post => createBarRow(post, getValue, maximumValue, fillClass))
        .join("");

}

function escapeHtml(value) {

    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;

}