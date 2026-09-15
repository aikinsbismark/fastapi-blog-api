import { config } from "./config";
import { isAuthenticated, getCurrentUser } from "../actions/authentication.js";


const root = document.getElementById("comment-root");
const blogId = root.dataset.blogId;

let currentUser = null;
let token = null;
let commentTree = [];
let openReplySlotId = null; 

async function initializeComment() {
    await loadAuthenticatedUser();

    setupComposerVisibility();
    initComposer();
    await loadComments();
}
initializeComment();

async function loadAuthenticatedUser() {
    const storedSession = isAuthenticated();

    if (!storedSession) {
        return;
    }

    token = storedSession.access_token || storedSession.token;
    currentUser = await getCurrenUser(token);
}

function setupComposerVisibility() {
    const composer = document.getElementById("composer");
    const lockedMessage = document.getElementById("composerLocked");

    if (currentUser) {
        composer.classList.remove("hidden");
        lockedMessage.classList.add("hidden");

        document.getElementById("composerAvatar").innerHTML =
            getAvatarContent(currentUser);

        return;
    }

    composer.classList.add("hidden");
    lockedMessage.classList.remove("hidden");
}

async function loadComments() {
    const commentList = document.getElementById("commentList");

    try {
        commentTree = await apiFetch(`/comments/${blogId}`);

        renderCommentList();
    } catch (error) {
        console.error("Failed to load comments:", error);

        commentList.innerHTML = `
            <div class="comment-list-empty">
                Couldn't load comments.
                Please refresh the page and try again.
            </div>
        `;
    }
}

function renderCommentList() {
    const commentList = document.getElementById("commentList");

    if (commentTree.length === 0) {
        commentList.innerHTML = `
            <div class="comment-list-empty">
                No comments yet.
                Be the first to share your thoughts.
            </div>
        `;
        return;
    }

    commentList.innerHTML = commentTree
        .map((comment) => topLevelCommentHTML(comment))
        .join("");

    attachListeners(commentList);
}

function flattenReplies(replies, parentUsername, depth) {
    let flat = [];

    for (const reply of replies || []) {
        flat.push({
            ...reply,
            showReplyingTo: depth > 0,
            replyingToUsername: parentUsername,
        });

        if (Array.isArray(reply.replies) && reply.replies.length > 0) {
            flat = flat.concat(
                flattenReplies(reply.replies, reply.username, depth + 1)
            );
        }
    }

    flat.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    return flat;
}

function topLevelCommentHTML(comment) {
    const flatReplies = flattenReplies(comment.replies, comment.username, 0);
    const hasReplies = flatReplies.length > 0;
    const isCurrentUsersComment =
        currentUser && comment.user_id === currentUser.id;

    return `
        <div class="comment" data-id="${comment.id}">
            <div class="comment__avatar">
                ${getAvatarContent(comment)}
            </div>
            <div class="comment__body">
                <div class="comment__line1">
                    <span class="comment__author">
                        ${escapeHtml(comment.username || "Anonymous")}
                    </span>
                    <span class="comment__text">
                        ${renderContent(comment.content)}
                    </span>
                </div>
                <div class="comment__meta">
                    <span>${formatDateTime(comment.created_at)}</span>
                    ${
                        currentUser
                            ? `
                                <button
                                    data-action="reply"
                                    data-top-id="${comment.id}"
                                    data-mention="">
                                    Reply
                                </button>
                              `
                            : ""
                    }
                    ${
                        isCurrentUsersComment
                            ? `
                                <button
                                    class="comment__delete"
                                    data-action="delete"
                                    data-id="${comment.id}">
                                    Delete
                                </button>
                              `
                            : ""
                    }
                </div>

                <div
                    class="reply-slot"
                    data-reply-slot="${comment.id}">
                </div>

                ${
                    hasReplies
                        ? `
                            <button
                                class="view-replies"
                                data-action="toggle-replies"
                                data-id="${comment.id}">
                                View Replies (${flatReplies.length})
                            </button>

                            <div
                                class="comment__replies hidden"
                                data-replies-for="${comment.id}"
                                data-reply-count="${flatReplies.length}">
                                ${flatReplies
                                    .map((reply) =>
                                        replyHTML(reply, comment.id)
                                    )
                                    .join("")}
                            </div>
                          `
                        : ""
                }
            </div>
        </div>
    `;
}

function replyHTML(reply, topId) {
    const isCurrentUsersComment =
        currentUser && reply.user_id === currentUser.id;

    return `
        <div class="comment comment--reply" data-id="${reply.id}">
            <div class="comment__avatar">
                ${getAvatarContent(reply)}
            </div>
            <div class="comment__body">
                <div class="comment__line1">
                    <span class="comment__author">
                        ${escapeHtml(reply.username || "Anonymous")}
                    </span>
                    <span class="comment__text">
                        ${
                            reply.showReplyingTo
                                ? `<span class="comment__mention">@${escapeHtml(
                                      reply.replyingToUsername || ""
                                  )}</span> `
                                : ""
                        }${renderContent(reply.content)}
                    </span>
                </div>
                <div class="comment__meta">
                    <span>${formatDateTime(reply.created_at)}</span>
                    ${
                        currentUser
                            ? `
                                <button
                                    data-action="reply"
                                    data-top-id="${topId}"
                                    data-mention="${escapeHtml(
                                        reply.username || ""
                                    )}">
                                    Reply
                                </button>
                              `
                            : ""
                    }
                    ${
                        isCurrentUsersComment
                            ? `
                                <button
                                    class="comment__delete"
                                    data-action="delete"
                                    data-id="${reply.id}">
                                    Delete
                                </button>
                              `
                            : ""
                    }
                </div>
            </div>
        </div>
    `;
}

function attachListeners(container) {
    container.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const { action, id, topId, mention } = button.dataset;

        switch (action) {
            case "reply":
                openReplyBox(topId, mention);
                break;

            case "toggle-replies":
                toggleReplies(button);
                break;

            case "delete":
                deleteComment(id);
                break;
        }
    });
}

function initComposer() {
    const commentInput = document.getElementById("composerInput");
    const sendButton = document.getElementById("composerSend");

    commentInput.addEventListener("input", () => {
        autoGrow(commentInput);
        updateSendButtonState();
    });

    sendButton.addEventListener("click", () => {
        submitTopLevelComment();
    });

    commentInput.addEventListener("keydown", (event) => {
        const pressedEnter = event.key === "Enter";
        const wantsNewLine = event.shiftKey;

        if (pressedEnter && !wantsNewLine) {
            event.preventDefault();
            submitTopLevelComment();
        }
    });

    function updateSendButtonState() {
        sendButton.disabled = commentInput.value.trim().length === 0;
    }
}

async function submitTopLevelComment() {
    const commentInput = document.getElementById("composerInput");
    const sendButton = document.getElementById("composerSend");

    const commentText = commentInput.value.trim();

    if (!commentText) {
        return;
    }

    sendButton.disabled = true;

    try {
        await apiFetch(`/comments/${blogId}`, {
            method: "POST",
            body: JSON.stringify({
                content: commentText,
                parent_id: null,
            }),
        });

        await loadComments();

        commentInput.value = "";
        autoGrow(commentInput);

        showToast("Comment posted.");
    } catch (error) {
        showToast(error.message || "Failed to post comment.", "error");
    } finally {
        sendButton.disabled = commentInput.value.trim().length === 0;
    }
}

function openReplyBox(topId, mentionUsername) {
    if (openReplySlotId && openReplySlotId !== topId) {
        closeReplyBox(openReplySlotId);
    }

    const replySlot = document.querySelector(
        `[data-reply-slot="${topId}"]`
    );

    if (!replySlot) {
        return;
    }

    if (openReplySlotId === topId) {
        closeReplyBox(topId);
        return;
    }

    openReplySlotId = topId;

    const prefill = mentionUsername ? `@${mentionUsername} ` : "";

    replySlot.innerHTML = `
        <div class="reply-composer">
            <div class="reply-composer-avatar">
                ${getAvatarContent(currentUser)}
            </div>
            <div class="reply-composer-field">
                <textarea
                    class="reply-composer-input"
                    rows="1"
                    maxlength="2000"
                    placeholder="Write a reply...">${escapeHtml(
                        prefill
                    )}</textarea>
                <div class="reply-composer-actions">
                    <button
                        class="reply-composer-cancel"
                        data-action="cancel-reply">
                        Cancel
                    </button>
                    <button
                        class="reply-composer-send"
                        data-action="send-reply"
                        data-id="${topId}">
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `;

    const replyInput = replySlot.querySelector(".reply-composer-input");
    const sendButton = replySlot.querySelector(
        '[data-action="send-reply"]'
    );
    const cancelButton = replySlot.querySelector(
        '[data-action="cancel-reply"]'
    );

    autoGrow(replyInput);

    replyInput.addEventListener("input", () => {
        autoGrow(replyInput);
    });

    replyInput.addEventListener("keydown", (event) => {
        const pressedEnter = event.key === "Enter";
        const wantsNewLine = event.shiftKey;

        if (pressedEnter && !wantsNewLine) {
            event.preventDefault();

            const replyText = replyInput.value.trim();

            if (replyText) {
                submitReply(topId, replyText);
            }
        }
    });

    cancelButton.addEventListener("click", () => {
        closeReplyBox(topId);
    });

    sendButton.addEventListener("click", () => {
        const replyText = replyInput.value.trim();

        if (replyText) {
            submitReply(topId, replyText);
        }
    });

    replyInput.focus();

    const cursorPos = replyInput.value.length;
    replyInput.setSelectionRange(cursorPos, cursorPos);
}

function closeReplyBox(topId) {
    const replySlot = document.querySelector(
        `[data-reply-slot="${topId}"]`
    );

    if (replySlot) {
        replySlot.innerHTML = "";
    }

    if (openReplySlotId === topId) {
        openReplySlotId = null;
    }
}

async function submitReply(topId, replyText) {
    if (!replyText) {
        return;
    }

    try {
        await apiFetch(`/comments/${blogId}`, {
            method: "POST",
            body: JSON.stringify({
                content: replyText,
                parent_id: Number(topId),
            }),
        });

        closeReplyBox(topId);

        await loadComments();

        showToast("Reply posted.");
    } catch (error) {
        showToast(error.message || "Failed to post reply.", "error");
    }
}

function toggleReplies(button) {
    const commentId = button.dataset.id;

    const replyContainer = document.querySelector(
        `[data-replies-for="${commentId}"]`
    );

    if (!replyContainer) {
        return;
    }

    const repliesAreHidden = replyContainer.classList.contains("hidden");
    const replyCount = replyContainer.dataset.replyCount;

    if (repliesAreHidden) {
        replyContainer.classList.remove("hidden");
        button.textContent = "Hide Replies";
        return;
    }

    replyContainer.classList.add("hidden");
    button.textContent = `View Replies (${replyCount})`;
}

async function deleteComment(commentId) {
    const confirmed = confirm("Delete this comment?");

    if (!confirmed) {
        return;
    }

    try {
        await apiFetch(`/comments/${commentId}`, {
            method: "DELETE",
        });

        await loadComments();

        showToast("Comment deleted.");
    } catch (error) {
        showToast(error.message || "Failed to delete comment.", "error");
    }
}

async function apiFetch(path, options = {}) {
    const url = `${config.API_BASE_URL}${path}`;

    const requestHeaders = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));

        throw new Error(
            errorBody.detail || `Request failed (${response.status})`
        );
    }

    const responseText = await response.text();

    return responseText ? JSON.parse(responseText) : null;
}

function getAvatarContent(user) {
    if (user?.profile_picture_url) {
        return `
            <img
                src="${escapeHtml(user.profile_picture_url)}"
                alt="Profile picture">
        `;
    }

    return getInitials(user?.username);
}

function getInitials(username) {
    return (username || "?").slice(0, 2).toUpperCase();
}

function renderContent(content) {
    const safeContent = escapeHtml(content ?? "");
    const mentionMatch = safeContent.match(/^(@[^\s]+)(\s+)/);

    if (!mentionMatch) {
        return safeContent;
    }

    const [fullMatch, mention, whitespace] = mentionMatch;

    return (
        `<span class="comment__mention">${mention}</span>${whitespace}` +
        safeContent.slice(fullMatch.length)
    );
}

function autoGrow(textarea) {
    const MAX_HEIGHT = 120;

    textarea.style.height = "auto";
    textarea.style.height =
        Math.min(textarea.scrollHeight, MAX_HEIGHT) + "px";
}

function formatDateTime(dateString) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function escapeHtml(value) {
    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;
}

const TOAST_DURATION = 2800;

let toastTimer = null;

function showToast(message, toastType = "") {
    const toastElement = document.getElementById("toast");

    toastElement.textContent = message;
    toastElement.className = "toast" + (toastType ? ` ${toastType}` : "");

    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastElement.classList.remove("show");
    }, TOAST_DURATION);
}