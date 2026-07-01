import { config } from "./config";
import { isAuthenticated, getCurrenUser } from "../actions/authentication";


const root = document.getElementById('comment-root');
const blogId = root.dataset.blogId;

let currentUser = null;
let token = null;
let commentTree = [];
let openReplyId = null;


async function initializeComment() {
    await loadAuthenticatedUser();

    setComposerVisibility();
    initComposer();
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

        setAvatar(
            document.getElementById("composerAvatar"),
            currentUser
        );

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
        .map(comment => commentHTML(comment))
        .join("");

    attachListeners(commentList);
}


function commentHTML(comment) {
    const hasReplies =
        Array.isArray(comment.replies) &&
        comment.replies.length > 0;

    const isCurrentUsersComment =
        currentUser &&
        comment.user_id === currentUser.id;

    return `
        <div class="comment" data-id="${comment.id}">
            <div class="comment__avatar">
                ${avatarContent(comment)}
            </div>
            <div class="comment__body">
                <div class="comment__line1">
                    <span class="comment__author">
                        ${escapeHtml(comment.username || "Anonymous")}
                    </span>
                    <span class="comment__text">
                        ${escapeHtml(comment.content)}
                    </span>
                </div>
                <div class="comment__meta">
                    <span>${formatDateTime(comment.created_at)}</span>
                    ${
                        currentUser
                            ? `
                                <button
                                    data-action="reply"
                                    data-id="${comment.id}">
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
                                View Replies (${comment.replies.length})
                            </button>

                            <div
                                class="comment__replies hidden"
                                data-replies-for="${comment.id}">

                                ${comment.replies
                                    .map(reply => commentHTML(reply))
                                    .join("")}

                            </div>
                          `
                        : ""
                }
            </div>
        </div>
    `;
}

function attachListener(container) {
    container.addEventListener("click", (event) => {
        const button = event.target.closet("[data-action]");

        if (!button) {
            return;
        }

        const { action, id } = button.dataset;

        switch (action) {
            case "reply":
                openReplyBox(id);
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
        sendButton.disabled =
            commentInput.value.trim().length === 0;
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
        showToast(
            error.message || "Failed to post comment.",
            "error"
        );
    } finally {
        sendButton.disabled =
            commentInput.value.trim().length === 0;
    }
}

function openReplyBox(parentId) {
    if (openReplyId && openReplyId !== parentId) {
        closeReplyBox(openReplyId);
    }

    const replySlot = document.querySelector(
        `[data-reply-slot="${parentId}"]`
    );

    if (!replySlot) {
        return;
    }

    if (openReplyId === parentId) {
        closeReplyBox(parentId);
        return;
    }

    openReplyId = parentId;

    replySlot.innerHTML = `
        <div class="reply-composer">
            <div class="reply-composer-avatar">
                ${avatarContent(currentUser)}
            </div>
            <div class="reply-composer-field">
                <textarea
                    class="reply-composer-input"
                    rows="1"
                    maxlength="2000"
                    placeholder="Write a reply...">
                </textarea>
                <div class="reply-composer-actions">
                    <button
                        class="reply-composer-cancel"
                        data-action="cancel-reply">
                        Cancel
                    </button>
                    <button
                        class="reply-composer-send"
                        data-action="send-reply"
                        data-id="${parentId}"
                        disabled>
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `;

    const replyInput =
        replySlot.querySelector(".reply-composer-input");

    const sendButton =
        replySlot.querySelector('[data-action="send-reply"]');

    const cancelButton =
        replySlot.querySelector('[data-action="cancel-reply"]');

    replyInput.addEventListener("input", () => {
        autoGrow(replyInput);
        sendButton.disabled =
            replyInput.value.trim().length === 0;
    });

    replyInput.addEventListener("keydown", (event) => {
        const pressedEnter = event.key === "Enter";
        const wantsNewLine = event.shiftKey;

        if (pressedEnter && !wantsNewLine) {
            event.preventDefault();

            const replyText = replyInput.value.trim();

            if (replyText) {
                submitReply(parentId, replyText);
            }
        }
    });

    cancelButton.addEventListener("click", () => {
        closeReplyBox(parentId);
    });

    sendButton.addEventListener("click", () => {
        submitReply(parentId, replyInput.value.trim());
    });

    replyInput.focus();
}

async function submitReply(parentId, replyText) {

    if (!replyText) {
        return;
    }

    try {

        await apiFetch(`/comments/${blogId}`, {
            method: "POST",
            body: JSON.stringify({
                content: replyText,
                parent_id: Number(parentId),
            }),
        });

        closeReplyBox(parentId);

        await loadComments();

        showToast("Reply posted.");

    } catch (error) {

        showToast(
            error.message || "Failed to post reply.",
            "error"
        );
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

    const repliesAreHidden =
        replyContainer.classList.contains("hidden");

    const replyCount =
        replyContainer.querySelectorAll(":scope > .comment").length;

    if (repliesAreHidden) {
        replyContainer.classList.remove("hidden");
        button.textContent = "Hide Replies";
        return;
    }

    replyContainer.classList.add("hidden");
    button.textContent = `View Replies (${replyCount})`;
}

async function deleteComment(commentId) {

    const confirmed = confirm(
        "Delete this comment?"
    );

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

        showToast(
            error.message || "Failed to delete comment.",
            "error"
        );
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

        const errorBody =
            await response.json().catch(() => ({}));

        throw new Error(
            errorBody.detail ||
            `Request failed (${response.status})`
        );

    }

    const responseText = await response.text();

    return responseText
        ? JSON.parse(responseText)
        : null;
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

    return (username || "?")
        .slice(0, 2)
        .toUpperCase();

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

    toastElement.className =
        "toast" + (toastType ? ` ${toastType}` : "");

    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastElement.classList.remove("show");
    }, TOAST_DURATION);

}