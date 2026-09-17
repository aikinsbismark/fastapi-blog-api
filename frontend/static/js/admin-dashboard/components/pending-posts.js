import { config } from "../../config.js";


let pendingBlogs = [];
let token = null;

export function setPendingToken(sessionToken) {
    token = sessionToken;
}

export async function initializePendingPosts() {
    return loadPendingBlogs();
}

export async function loadPendingBlogs() {
    const response = await fetch (`${config.API_BASE_URL}/blog/pending`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    pendingBlogs = await response.json();

    renderRecentPending();
    renderAllPending();
    return pendingBlogs;
}

export function renderRecentPending(posts = pendingBlogs) {
    const container = document.getElementById('recentPendingList');

    if (!container) {
        return;
    }

    if (!posts.length) {
        container.innerHTML = `
            <div class="empty-state">
                No pending blogs.
            </div>
        `;
        return;
    }

    container.innerHTML = posts.slice(0, 3).map(createPendingCard).join("");
    attachPendingActions(container);
}

export function renderAllPending(posts = pendingBlogs) {
    const container = document.getElementById("allPendingList");
    if (!container) return;
    container.innerHTML = posts.length
        ? posts.map(createPendingCard).join("")
        : '<div class="empty-state">No pending blogs.</div>';
    attachPendingActions(container);
}

export function createPendingCard(blog) {
    const authorName = blog.author?.username ?? 'Unknown author';

    return `
        <div class="pending-row" data-id="${blog.id}">
            <div class="pending-row-info">
                <div class="pending-row-title">
                    ${escapeHtml(blog.title)}
                </div>

                <div class="pending-row-meta">
                    by ${escapeHtml(authorName)}
                </div>
            </div>

            <div class="pending-row-actions">
                <button
                    class="btn-success"
                    data-action="approve"
                    data-id="${blog.id}"
                >
                    <i data-icon="check"></i>
                    Publish
                </button>

            </div>
        </div>
    `;
}

function attachPendingActions(container) {
    const buttons = container.querySelectorAll('[data-action="approve"]');

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            const blogId = Number(button.dataset.id);

            button.disabled = true;

            button.textContent = "Publishing...";

            try {
                const response = await fetch(`${config.API_BASE_URL}/blog/${blogId}/publish`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                await loadPendingBlogs();
            } catch (error) {
                console.error(error);

                button.disabled = false;
                button.textContent = "Publish";
            }
        });
    });
}

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}