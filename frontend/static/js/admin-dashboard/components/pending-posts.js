import { config } from "../../config";
import { isAuthenticated } from "../../../actions/authentication.js";
import { publishBlog } from "./published-posts.js";


let pendingBlogs = [];
let token = null;


export async function initializePendingPosts() {
    const session = isAuthenticated();

    if (!session) {
        return;
    }
    
    token = session.access_token || session.token;

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
}

export function renderRecentPending() {
    const container = document.getElementById('recentPendingList');

    if (!container) {
        return;
    }

    if (!pendingBlogs.length) {
        container.innerHTML = `
            <div class="empty-state">
                No pending blogs.
            </div>
        `;
        return;
    }

    container.innerHTML = pendingBlogs.slice(0, 3).map(createPendingCard).join("");
    attachPublishEvents(container);
}

export function createPendingCard(blog) {
    const authorName = post.author?.username ?? 'Unknown author';

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
                    data-id="${post.id}"
                >
                    <i data-icon="check"></i>
                    Publish
                </button>

                <button
                    class="btn-danger"
                    data-action="reject"
                    data-id="${post.id}"
                >
                    <i data-icon="x"></i>
                    Reject
                </button>
            </div>
        </div>
    `;
}

function attachPendingActions(container) {
    const buttons = container.querySelectorAll(".publish-button");

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            const blogId = Number(button.dataset.blogId);

            button.disabled = true;

            button.textContent = "Publishing...";

            try {
                await publishBlog(blogId);

                await pendingBlogs();
            } catch (error) {
                console.error(error);

                button.disabled = false;
                button.textContent = "Publish";
            }
        });
    });
}
