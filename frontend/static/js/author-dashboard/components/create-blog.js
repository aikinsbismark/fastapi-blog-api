import { getAuthorSession, api, validatePost } from "./author-session.js";

export async function initCreatePage() {
    const form = document.getElementById("postForm");
    const errorElement = document.getElementById("formError");
    const successElement = document.getElementById("formSuccess");
    const submitBtn = document.getElementById("submitBtn");

    const session = await getAuthorSession();

    if (!session) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorElement.textContent = "";
        successElement.textContent = "";
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting..."

    try {
        const validated = validatePost(
            document.getElementById("postTitle").value,
            document.getElementById("postContent").value
        )
        await api.createPost(session.token, validated);
        successElement.textContent = "Sent to the admin for review.";
        form.reset();
    } catch (error) {
        errorElement.textContent = error.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit for review"
    }
});
}    