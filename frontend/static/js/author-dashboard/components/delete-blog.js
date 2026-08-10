import { config } from "../../config.js";



export async function deletePost(token, id) {
    const response = await fetch(`${config.API_BASE_URL}/blog/delete/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status}`);
    }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderPostItem(post) {
    const isPublished = String(post.status).toUpperCase().includes(config.BLOG_STATUS.PUBLISHED);
    const statusModifier = isPublished ? "published" : "pending";
    const statusLabel = isPublished ? "Published" : "Awaiting Review";
    return `
        <div class="post-item" data-post-id="${post.id}">
            <div class="post-item-info">
                <h3 class="post-item-title">${escapeHtml(post.title)}</h3>
                <span class="post-item-status ${statusModifier}">${escapeHtml(statusLabel)}</span>
             </div>
                <div class="post-item-actions">
                    <button class="delete-post" type="button">Delete</button>
            </div>
        </div>
    `;
}

function renderPostList(container, posts) {
    if (!container) {
        return;
    }

    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">No posts yet</div>
        `;
        return;
    }

    container.innerHTML = posts.map(renderPostItem).join("");
}

export function wireDeleteHandlers(container, onDelete) {
  if (!container) {
    return;
  }
 
  container.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-post");
    if (!button) {
        return;
    }
    
    const id = button.closest(".post-item")?.dataset.postId;
    if (!id) {
        return;
    }
 
    const confirmed = window.confirm("Do you want to delete this post? This action cannot be undone.");
    if (!confirmed) {
        return;
    }
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Deleting...";
 
    try {
      await onDelete(id);
    } catch (error) {
      button.disabled = false;
      button.textContent = originalText;
      window.alert(`Failed to delete post: ${error.message}`);
    }
  });
}