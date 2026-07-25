import { config } from "../../config.js";
import { isAuthenticated, getCurrentAdmin } from "../../../actions/authentication.js";
import { initializePendingPosts } from "./pending-posts.js";


let token = null;
let currentAdmin = null;
let publishedBlogs = [];


export async function initializePublishPage() {
    const session = isAuthenticated();

    if (!session) {
        window.location.href = "/login.html";
        return;
    }

    token = session.access_token || session.token;

    currentAdmin = await getCurrentAdmin(token);

    if (!currentAdmin) {
        window.location.href = "/login.html";
        return;
    }

    showDashboard();

    await loadPendingBlogs();
    await loadPublishedBlogs();
}

document.addEventListener("DOMContentLoaded", initializePublishPage);

export async function loadPublishedBlogs() {
    const response = await fetch(`${config.API_BASE_URL}/blog/`);

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    
    publishedBlogs = result.blogs;

    renderPublishedBlogs();
}

export async function publishBlog(blogId) {
    const response = await fetch (`${config.API_BASE_URL}/blog/${blogId}/publish`, {
        method: "PUT", 
        headers: {
            Authorization: `Bearer ${token}`
        },
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    await loadPendingBlogs();
    await loadPublishedBlogs();
}

function renderPublishedBlogs() {
    const container = document.getElementById("publishedBlogs");

    container.innerHTML = publishedBlogs.map(createPublishedBlogCard).join("");
}

function createPublishedBlogCard(blog) {
    return `
        <article class="published-card">
            <h3>${escapeHtml(blog.title)}</h3>

            <p>${escapeHtml(blog.content)}</p>

            <small>
                ${blog.likes_count} likes
            </small>
        </article>
    `;
}

function renderPublishedBlogs() {
    const container = document.getElementById("publishedBlogs");

    if (!publishedBlogs.length) {
        container.innerHTML =
            `<p>No published blogs yet.</p>`;
        return;
    }

    container.innerHTML = publishedBlogs.map(createPublishedCard).join("");
}