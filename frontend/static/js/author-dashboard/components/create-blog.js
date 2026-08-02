import { config } from "../../config.js";
import { getCurrentAuthor } from "../../../actions/authentication.js";



export async function createPostAPI(post) {
    const response = await fetch(`${config.API_BASE_URL}/blog/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCurrentAuthor()}`,
        },
        body: JSON.stringify(post),
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    return response.json();
}

export async function createPost(title, content) {
    const writeTitle = title.trim();
    const writeContent = content.trim();

    if (!writeTitle || !writeContent) {
        throw new Error("Title and content are required.");
    }

    if (writeTitle.length > 60) {
        throw new Error("Title should be 60 characters or fewer.");
    }

    return createPostAPI({ title: writeTitle, content: writeContent });
}

const form = document.getElementById("postForm");
const errorElement = document.getElementById("formError");
const successElement = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting..."

    try {
        await createPost(
            document.getElementById("PostTitle").value,
            document.getElementById("PostContent").value
        );

        successElement.textContent = "Sent to the admin for review.";
        form.reset();
    } catch (error) {
        errorElement.textContent = error.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit for review"
    }
});