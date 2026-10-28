import { config } from "../../config.js";

let token = null;
let allUsers = [];
let currentRoleFilter = "all";

export function setUsersToken(sessionToken) {
    token = sessionToken;
}

export async function loadUsers() {
    const response = await fetch(`${config.API_BASE_URL}/admin/users`, {

        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    allUsers = await response.json();

    renderUsers();
    return allUsers;
}

export function initializeRoleFilter() {
    const filterButtons = document.querySelectorAll("#roleFilterRow .filter-chip");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(chip =>
                chip.classList.remove("active")
            );

            button.classList.add("active");

            currentRoleFilter = button.dataset.filter;

            renderUsers();
        });
    });
}

function renderUsers() {
    const tableBody = document.getElementById("userTableBody");

    const users = getFilteredUsers();

    if (!users.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                    No users found.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(createUserRow).join("");

    attachDeleteEvents();
}

function getFilteredUsers() {
    if (currentRoleFilter === "all") {
        return allUsers;
    }

    return allUsers.filter((user) => user.role === currentRoleFilter);
}

const DELETE_PATHS = {
    user: "users",
    author: "authors",
    admin: "admins",
};

function createUserRow(user) {
    const actions = `
        <button class="delete-user"
                data-user-id="${user.id}"
                data-role="${escapeHtml(user.role)}">Delete</button>
    `;

    return `
        <tr>
            <td>
                <strong>${escapeHtml(user.username)}</strong><br>
                <small>${escapeHtml(user.email || "")}</small>
            </td>
            <td>${capitalize(user.role)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${actions}</td>
        </tr>
    `;
}

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}

function attachDeleteEvents() {
    const deleteButtons = document.querySelectorAll(".delete-user");

    deleteButtons.forEach((button => {
        button.addEventListener("click", async () => {
            const userId = Number(button.dataset.userId);
            const role = button.dataset.role;

            const confirmed = confirm(`Do you want to delete this ${role}?`);

            if (!confirmed) {
                return;
            }

            button.disabled = true;
            button.textContent = "Deleting...";

            try {
                await deleteUser(userId, role);

                await loadUsers(token);
            } catch (error) {
                console.error(error);
                alert(error.message);

                button.disabled = false;
                button.textContent = "Delete";
            }
        });
    }));
}

async function deleteUser(userId, role) {
    const path = DELETE_PATHS[role];
    const response = await fetch(`${config.API_BASE_URL}/admin/${path}/${userId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        let reason = `Response status: ${response.status}`;
        try {
            const data = await response.json();
            if (data.detail) reason = data.detail;
        } catch {}
        throw new Error(reason);
    }
}

function capitalize(text = "") {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date) {
    if (!date) {
        return "-";
    }

    return new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}