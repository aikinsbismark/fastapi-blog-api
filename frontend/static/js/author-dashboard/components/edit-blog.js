import { config } from "../../config.js";
import { isAuthenticated, getCurrentAuthor, removeLocalStorage } from "../../../actions/authentication.js";



const maxTitleLength = 60;

function extractToken(storedUser) {
    return storedUser?.access_token ?? storedUser?.token ?? storedUser?.jwt ?? null;
}

export async function getAuthorSession() {
    const storedUser = isAuthenticated();
    if (!storedUser) {
        window.location.href = "/login.html";
        return null;
    }
    const token = extractToken(storedUser);
    const author = await getCurrentAuthor(token);
    
    if (!author) {
        removeLocalStorage("user");
        window.location.href = "/login.html";
        return null;
    }

    return { token, author };
}


export async function getAuthorPostAPI() {
    const response = await fetch(`${config.API_BASE_URL}/blog/author/details`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Could not load post: ${response.status}`);
    }

    return response.json();
}

export async function updatePost(token, id, post) {
    const response = await fetch(`${config.API_BASE_URL}/blog/update/${id}`, {
        method: "PUT", 
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(post),
    });

    if (!response.ok) {
        throw new Error(`Failed to update post: ${response.status}`);
    }

    return response.json();
}

export async function createPost(title, content) {
    const writeTitle = title.trim();
    const writeContent = content.trim();

    if (!writeTitle || !writeContent) {
        throw new Error("Title and content are required.");
    }

    if (writeTitle.length > maxTitleLength) {
        throw new Error(`Title should be ${maxTitleLength} characters or fewer.`);
    }

    return {title: writeTitle, content: writeContent};
}

const form = document.getElementById("postForm");
const titleField = document.getElementById("postTitle");
const contentField = document.getElementById("postContent");
const errorElement = document.getElementById("formError");
const successElement = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");


const postId = new URLSearchParams(window.location.search).get("id");

function showLoadError(message) {
  errorElement.textContent = message;
  form.hidden = true;
}

if (!postId) {
  errorElement.textContent = "No post ID provided.";
}

async function loadPost(token) {
  if (!postId) {
    showLoadError("No post ID provided.");
    return;
  }

  try {
    const posts = await getAuthorPostAPI(token);
    const matchedPost = posts.find(post => String(post.id) === String(postId));

    if (!matchedPost) {
      showLoadError("Could not find the post.");
      return;
    }

    titleField.value = matchedPost.title ?? "";
    contentField.value = matchedPost.content ?? "";
  } catch (error) {
    showLoadError("Failed to load the post. Please try again later.");
    console.error("Error loading post:", error);
  }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
        const buildValidatedPost = await createPost(titleField.value, contentField.value);
        await updatePost(token, postId, buildValidatedPost);

        successElement.textContent = "Post updated successfully."
    } catch (error) {
        errorElement.textContent = "Error:", error;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save changes";
    }
});

async function initializeEditBlog() {
    const session = await getAuthorSession();
    
    if (!session) {
        return;
    }

    if (pageWrapper) {
        pageWrapper.hidden = false;
    }

    await loadPost(session);
}

return initializeEditBlog();