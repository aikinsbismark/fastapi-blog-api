import { config } from "./config.js";
import { isAuthenticated, getCurrenUser } from "../actions/authentication.js";

let currentBlogId = null;
let currentUser = null;
let currentUserLikeId = null;
let isLiked = false;
let isSaving = false;
let lastTapAt = 0;


const DOUBLE_TAP_DELAY = 300; 

function getSessionToken() {
	const currentSession = isAuthenticated();

	if (!currentSession) {
		return null;
	}

	return currentSession.access_token || currentSession.token || null;
}

function getLikeElements() {
    return {
		likeButton: document.getElementById("likeBtn"),
        likeCount: document.getElementById("likeCount"),
        likeIcon: document.getElementById("likeIcon"),
        likeLabel: document.getElementById("likeLabel"),
        likeBurst: document.getElementById("likeBurst"),
        likeHint: document.getElementById("likeHint"),
    };
}

function renderLikeControls({ likesCount = 0, disabled = false} = {}) {
	const likesContainer = document.getElementById("likes-section");

	if (!likesContainer) {
		return;
	}
	const hintMessage = disabled
	? "Log in to like this post"
	: "Double tap to like this post";

	likesContainer.innerHTML = `
		<div class="like-panel">
			<button id="likeBtn" 
					class="like-button" 
					type="button"
					aria-pressed="false"
					${disabled ? "disabled" : ""}>
				<span id="likeIcon" class="like-icon">❤️</span>
					<strong><span id="likeCount">${likesCount}</span></strong>
			</button>
			<p id="likeHint" class="like-hint">${hintMessage}</p>
		</div>
	`;

	const likeButton = document.getElementById("likeBtn");

	if (likeButton) {
    	likeButton.addEventListener("click", handleLikeAction);
	}

	updateLikeIconState(isLiked);
}

function renderBlogContent(blog) {
    const blogContainer = document.getElementById("blog-content");

    if (!blogContainer) {
        return;
    }

	blogContainer.innerHTML = `
		<article class="blog-detail-card" data-like-surface="true">
			<div id="likeBurst" class="like-burst" aria-hidden="true">♡</div>
            	<p class="blog-detail-card-eyebrow">Featured post</p>
            		<h1> ${escapeHtml(blog.title)}</h1>
            			<p class="blog-detail-card-content">${escapeHtml(blog.content)}</p>
        </article>
	`;

	attachDoubleTapLike(blogContainer);
}

function attachDoubleTapLike(surface) {
    if (surface.dataset.doubleTapAttached) {
        return;
    }

    surface.dataset.doubleTapAttached = "true";

    surface.addEventListener("touchend", (event) => {
		const currentTime = Date.now();

		const timeSinceLastTap = currentTime - lastTapAt;

		if (timeSinceLastTap >= DOUBLE_TAP_DELAY) {
			lastTapAt = currentTime;
			return;
        }

        event.preventDefault();

        handleLikeAction({
			forceLike: true,
            source: "double-tap",
        });

		lastTapAt = 0;

        },

        {
            passive: false,
        }
    );
}

export async function loadBlogDetailPage(blogId) {
	currentBlogId = blogId;

	const sessionToken = getSessionToken();

	currentUser = sessionToken ? await getCurrenUser(sessionToken) : null;

	const response = await fetch(`${config.API_BASE_URL}/blog/${blogId}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch blog");
	}

	const blogData = await response.json();

	currentUserLikeId = blogData.user_like_id || null;
	isLiked = Boolean(currentUserLikeId || blogData.is_liked);

	const totalLikes = blogData.likes_count ?? blogData.likes ?? 0;

	renderBlogContent(blogData);

	renderLikeControls({
		likesCount: totalLikes,
		disabled: !currentUser,
	});
}

function updateLikeIconState(isPostLiked) {
	const {likeButton, likeIcon, likeLabel,} = getLikeElements();

	if (!likeButton || !likeIcon || !likeLabel) {
    	return;
	}

    isLiked = isPostLiked;

    elements.likeButton.classList.toggle("is-liked", isLiked);

    elements.likeButton.setAttribute(
        "aria-pressed",
        String(isLiked)
    );

    elements.likeIcon.textContent = isLiked
        ? "♥"
        : "♡";

    elements.likeLabel.textContent = isLiked
        ? "Unlike"
        : "Like";
}

function showLikeBurst() {
    const { likeBurst } = getLikeElements();

    if (!likeBurst) {
        return;
    }

    likeBurst.classList.remove("is-visible");

    void likeBurst.offsetWidth;

    likeBurst.classList.add("is-visible");
}

function canLikePost(token, hintElement) {
    if (token && currentUser) {
        return true;
    }

    if (hintElement) {
        hintElement.textContent = "Please log in to like this post.";
    }

    return false;
}

async function handleLikeAction(options = {}) {
    const {forceLike = false, source = "button",} = options;

    const sessionToken = getSessionToken();
    const elements = getLikeElements();

    if (!canLikePost(sessionToken, elements.likeHint)) {
        return;
    }

    if (isSaving || !currentBlogId) {
        return;
    }

    if (forceLike && isLiked) {
        showLikeBurst();
        return;
    }

    isSaving = true;
    elements.likeButton.disabled = true;

    try {
        if (isLiked && currentUserLikeId) {
            await unlikePost(sessionToken, elements);
        } else {
            await likePost(sessionToken, elements, source);
        }
    } catch (error) {
        elements.likeHint.textContent = error.message;
    } finally {
        isSaving = false;
        elements.likeButton.disabled = !currentUser;
    }
}

async function unlikePost(token, elements) {
    const response = await fetch(`${config.API_BASE_URL}/like/delete/${currentUserLikeId}`, {
		method: "DELETE",
		headers: {
			"Authorization": `Bearer ${token}`
		}
	});

	if (!response.ok) {
		throw new Error("Failed to unlike the post.");
	}

    currentUserLikeId = null;

	const currentLikes = Number.parseInt(elements.likeCount.textContent, 10) || 0;

    elements.likeCount.textContent = Math.max(currentLikes - 1, 0);

    updateLikeIconState(false);

    elements.likeHint.textContent = "Double tap the post to like";
}

async function likePost(token, elements, source) {
	const response = await fetch(`${config.API_BASE_URL}/like/blog/${currentBlogId}`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			user_id: currentUser.id
		})
	});

	if (!response.ok) {
		throw new Error("Failed to like the post.");
	}

	const data = await response.json();

	const currentLikes = Number.parseInt(elements.likeCount.textContent, 10) || 0;

	elements.likeCount.textContent = currentLikes + 1;

	currentUserLikeId = data.id;

    updateLikeIconState(true);

    showLikeBurst();

    elements.likeHint.textContent =
        source === "double-tap"
            ? "Liked with a double tap."
            : "You liked this post.";
}

function escapeHtml(text = "") {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.loadBlogDetailPage = loadBlogDetailPage;