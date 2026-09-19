import { getAuthorSession, api, validatePost } from "./author-session.js";

export async function initComposePage(onSaved) {
  const form = document.getElementById("postForm");
  const errorElement = document.getElementById("formError");
  const successElement = document.getElementById("formSuccess");
  const submitBtn = document.getElementById("submitBtn");
  const postIdField = document.getElementById("postId");
  const cancelBtn = document.getElementById("cancelEditBtn");

  const session = await getAuthorSession();
  if (!session) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";

    const isEditing = Boolean(postIdField.value);
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? "Saving..." : "Submitting...";

    try {
      const validated = validatePost(
        document.getElementById("postTitle").value,
        document.getElementById("postContent").value
      );

      if (isEditing) {
        await api.updatePost(session.token, postIdField.value, validated);
        successElement.textContent = "Post updated and sent for review.";
      } else {
        await api.createPost(session.token, validated);
        successElement.textContent = "Sent to the admin for review.";
        form.reset();
      }

      await onSaved?.();
    } catch (error) {
      errorElement.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? "Save changes" : "Submit for review";
    }
  });

  cancelBtn?.addEventListener("click", startNewPost);
}

export function startNewPost() {
  document.getElementById("postId").value = "";
  document.getElementById("postForm").reset();
  document.getElementById("formError").textContent = "";
  document.getElementById("formSuccess").textContent = "";
  document.getElementById("composeHeading").textContent = "Write a new post";
  document.getElementById("composeSub").textContent =
    "It will be sent to the admin for review before it's published.";
  document.getElementById("submitBtn").textContent = "Submit for review";
  document.getElementById("cancelEditBtn")?.classList.add("hidden");
}

export async function startEditPost(id) {
  const errorElement = document.getElementById("formError");

  const session = await getAuthorSession();
  if (!session) {
    return;
  }

  try {
    const posts = await api.getAuthorPosts(session.token);
    const post = posts.find((p) => String(p.id) === String(id));

    if (!post) {
      errorElement.textContent = "Could not find that post.";
      return;
    }

    document.getElementById("postId").value = id;
    document.getElementById("postTitle").value = post.title ?? "";
    document.getElementById("postContent").value = post.content ?? "";
    document.getElementById("composeHeading").textContent = "Edit post";
    document.getElementById("composeSub").textContent =
      "Changes are sent to the admin for review again before they go live.";
    document.getElementById("submitBtn").textContent = "Save changes";
    document.getElementById("cancelEditBtn")?.classList.remove("hidden");
  } catch (error) {
    errorElement.textContent = "Failed to load the post. Please try again later.";
    console.error("startEditPost failed:", error);
  }
}