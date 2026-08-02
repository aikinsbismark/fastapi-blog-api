import { config } from "../../config.js";
import { getCurrentAuthor } from "../../../actions/authentication.js";


export async function getPostAPI() {
    const response = await fetch(`${config.API_BASE_URL}/blog/author/details`, {
        method: "GET",
        headers: {
            Athorization: `Bearer ${getCurrentAuthor()}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Could not load post: ${response.status}`);
    }

    return response.json();
}

export async function updatePost(id, post) {
    const response = await fetch(`${config.API_BASE_URL}/blog/update/${id}`, {
        method: "PUT", 
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCurrentAuthor()}`,
        },
        body: JSON.stringify(post),
    });

    if (!response.ok) {
        throw new Error(`Failed to update post: ${response.status}`);
    }

    return response.json();
}

export async function createPost(id, title, content) {
    const writeTitle = title.trim();
    const writeContent = content.trim();

    if (!writeTitle || !writeContent) {
        throw new Error("Title and content are required.");
    }

    if (writeTitle.length > 60) {
        throw new Error("Title should be 60 characters or fewer.");
    }

    return updatePost(id, { title: writeTitle, content: writeContent });
}

const form = document.getElementById("postForm");
const errorElement = document.getElementById("formError");
const successElement = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");


const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

if (!postId) {
  errorElement.textContent = "No post ID provided.";
}

async function loadPost() {
  if (!postId) return;

  try {
    const post = await getPostAPI(postId);
    document.getElementById("postTitle").value = post.title || "";
    document.getElementById("postContent").value = post.content || "";
  } catch (error) {
    errorElement.textContent = "Error:", error;
  }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
        await updatePost(
            document.getElementById("PostTitle").value,
            document.getElementById("postContent").value
        );

        successElement.textContent = "Post updated successfully."
    } catch (error) {
        errorElement.textContent = "Error:", error;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save changes";
    }
});

loadPost();