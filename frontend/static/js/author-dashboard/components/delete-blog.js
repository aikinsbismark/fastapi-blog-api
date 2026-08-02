import { config } from "../../config.js";
import { getCurrentAuthor, getCurrentAdmin } from "../../../actions/authentication.js";



export async function getPostAPI(id) {
    const response = await fetch(`${config.API_BASE_URL}/blog/author/details`, {
        method: "GET", 
        headers: {
            Authorization: `Bearer ${getCurrentAuthor()}`
        },
    });

    if (!response.ok) {
        throw new Error(`Could not load post: ${response.status}`);
    }

    return response.json();
}

export async function deletePost(id, post) {
    const response = await fetch(`${config.API_BASE_URL}/blog/delete/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${getCurrentAuthor() || getCurrentAdmin()}`
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status}`);
    }
}

const deleteBtnSelector = ".delete-post";
const postItemSelector = ".post-item";

function renderPostItem(post) {
    return `
        <div class="post-item" data-post-id="${post.id}">
            <div class="post-item-info">
                <h3 class="post-item-title">${post.title}</h3>
                <span class="post-item-status">${post.status}</span>
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

export async function loadAndRenderPosts() {
    const recentContainer = document.getElementById("recentPostList");
    const allContainer = document.getElementById("allPostList");

    try {
        const posts = await getPostAPI();

        renderPostList(recentContainer, posts.slice(0, 5));
        renderPostList(allContainer, posts);

    } catch (error) {
        console.error("Failed to load posts:", error);

        const errorMsg = `
            <div class="empty-state">Could not load posts</div>
        `;

        if (recentContainer) {
            recentContainer.innerHTML = errorMsg;
        }

        if (allContainer) {
            allContainer.innerHTML = errorMsg;
        }

        return;

        initializeDeleteHandlers(recentContainer);
        initializeDeleteHandlers(allContainer);
    }
}

function findPostId(button) {
  const postItem = button.closest(postItemSelector);
  return postItem ? postItem.dataset.postId : null;
}
 
async function handleDeleteClick(event) {
  const button = event.target.closest(deleteBtnSelector);
  if (!button) {
    return;
  }
 
  const postId = findPostId(button);
  if (!postId) {
    console.error("Could not find post id for delete button", button);
    return;
  }
 
  const confirmed = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
  if (!confirmed) {
    return;
  }
 
  const postItem = button.closest(postItemSelector);
  const originalText = button.textContent;
 
  button.disabled = true;
  button.textContent = "Deleting...";
 
  try {
    await deletePost(postId);
 
    if (postItem) {
      postItem.remove();
    }
 
    const container = button.closest(".post-list");
    if (container && !container.querySelector(POST_ITEM_SELECTOR)) {
      container.innerHTML = `
        <div class="empty-state">No posts yet.</div>
    `;
    }
  } catch (error) {
    console.error("Failed to delete post", error);
    button.disabled = false;
    button.textContent = originalText;
    window.alert(`Failed to delete post: ${error.message}`);
  }
}
 

export function initializeDeleteHandlers(container) {
  if (!container) {
    return;
  }

  container.addEventListener("click", handleDeleteClick);
}
