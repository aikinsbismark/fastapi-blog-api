import { getAuthorSession, api, validatePost } from "./author-session.js";


export async function initEditPage() {
  const form = document.getElementById("postForm");
  const titleField = document.getElementById("postTitle");
  const contentField = document.getElementById("postContent");
  const errorElement = document.getElementById("formError");
  const successElement = document.getElementById("formSuccess");
  const submitBtn = document.getElementById("submitBtn");
  const pageWrapper = document.getElementById("pageWrapper");
 
  const postId = new URLSearchParams(window.location.search).get("id");
  if (!postId) {
    errorElement.textContent = "No post ID provided.";
    form.hidden = true;
    return;
  }
 
  const session = await getAuthorSession();
  if (!session) return;
 
  if (pageWrapper) pageWrapper.hidden = false;
 
  try {
    const posts = await api.getAuthorPosts(session.token);
    const matchedPost = posts.find((post) => String(post.id) === String(postId));
 
    if (!matchedPost) {
      errorElement.textContent = "Could not find the post.";
      form.hidden = true;
      return;
    }
 
    titleField.value = matchedPost.title ?? "";
    contentField.value = matchedPost.content ?? "";
  } catch (error) {
    errorElement.textContent = "Failed to load the post. Please try again later.";
    console.error("Error loading post:", error);
    return;
  }
 
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
 
    try {
      const validated = validatePost(titleField.value, contentField.value);
      await api.updatePost(session.token, postId, validated);
      successElement.textContent = "Post updated successfully.";
    } catch (error) {
      errorElement.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save changes";
    }
  });
}
