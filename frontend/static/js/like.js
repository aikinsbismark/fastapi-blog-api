import { authUsers, getCurrentUser, getToken } from './auth.js';
import { CONFIG } from './config.js';
import { getErrorMessage, showModal } from './utils.js';

let currentBlogId = null;

let currentUserLikeId = null; 

/**
 * Initializes and loads details for a specific blog post view frame
 * @param {string} blogId 
 */
export async function loadBlogDetailPage(blogId) {
    currentBlogId = blogId;
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/blog/${blogId}`);
    const blog = await response.json();

    document.getElementById('blog-content').innerHTML = `<h1>${blog.title}</h1><p>${blog.content}</p>`;
    
    document.getElementById('likeCount').textContent = blog.likes_count || 0;

    const isLoggedIn = await authUsers.isAuthenticated();
    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = document.getElementById('likeIcon');

    if (!isLoggedIn) {
        likeBtn.disabled = true;
        likeBtn.title = "You must be logged in to like this post";
        likeIcon.className = "bi bi-heart";
        currentUserLikeId = null;
    } else {
        likeBtn.disabled = false;
        likeBtn.removeAttribute('title');

        // Store active like tracker primary key returned from backend schema if present
        currentUserLikeId = blog.user_like_id || null; 
        updateLikeIconState(!!currentUserLikeId);
    }
}

/**
 * Toggles the Bootstrap Icon layout classes based on the liked state
 * @param {boolean} isLiked 
 */
function updateLikeIconState(isLiked) {
    const likeIcon = document.getElementById('likeIcon');
    if (isLiked) {
        likeIcon.className = "bi bi-heart-fill";
    } else {
        likeIcon.className = "bi bi-heart";
    }
}

const likeBtnElement = document.getElementById('likeBtn');
if (likeBtnElement) {
    likeBtnElement.addEventListener('click', handleLikeAction);
}

async function handleLikeAction() {
    const token = getToken();
    if (!token) return alert("Authentication error. Please log in.");

    const likeCountElem = document.getElementById('likeCount');
    let currentCount = parseInt(likeCountElem.textContent, 10) || 0;

    try {
        if (currentUserLikeId) {
            const response = await fetch(`${CONFIG.API_BASE_URL}/like/delete/${currentUserLikeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                currentUserLikeId = null;
                likeCountElem.textContent = Math.max(0, currentCount - 1);
                updateLikeIconState(false);
            } else {
                const error = response.json();
                document.getElementById('errorMessage').textContent = getErrorMessage(error);
                showModal('errorModal');
            }
        } 
        else {
            const currentUser = await getCurrentUser();
            const response = await fetch(`${CONFIG.API_BASE_URL}/like/blog/${currentBlogId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: currentUser.id }) 
            });

            const data = await response.json();

            if (response.ok) {
                currentUserLikeId = data.id; 
                likeCountElem.textContent = currentCount + 1;
                updateLikeIconState(true);
            } else {
                const error = response.json();
                document.getElementById('errorMessage').textContent = getErrorMessage(error);
                showModal('errorModal');
            }
        }
    } catch (error) { 
        document.getElementById('errorMessage').textContent = 
        'Network error. Please check your connection and try again.';
        showModal('successModal');
    }
}
