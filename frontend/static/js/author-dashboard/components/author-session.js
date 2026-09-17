import { config } from "../../config.js";
import { isAuthenticated, getCurrentAuthor, removeLocalStorage } from "../../../actions/authentication.js";

export { config, removeLocalStorage } 



const max_title_length = 100;

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

export function escapeHtml(str) {
    return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function countComments(comments) {
  if (!comments || !comments.length) {
    return 0;
  }
  return comments.reduce((sum, comment) => sum + 1 + countComments(comment.replies || []), 0);
}
 
export function validatePost(title, content) {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
 
  if (!cleanTitle || !cleanContent) {
    throw new Error("Title and content are required.");
  }
  if (cleanTitle.length > max_title_length) {
    throw new Error(`Title should be ${max_title_length} characters or fewer.`);
  }
  return { title: cleanTitle, content: cleanContent };
}
 
async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    token,
    body,
  } = options;

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${config.API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getAuthorPosts(token) {
    return apiRequest("/blog/author/details", { token });
  },

  createPost(token, post) {
    return apiRequest("/blog/create", {
      method: "POST",
      token,
      body: post,
    });
  },

  updatePost(token, id, post) {
    return apiRequest(`/blog/update/${id}`, {
      method: "PUT",
      token,
      body: post,
    });
  },

  deletePost(token, id) {
    return apiRequest(`/blog/delete/${id}`, {
      method: "DELETE",
      token,
    });
  },
};