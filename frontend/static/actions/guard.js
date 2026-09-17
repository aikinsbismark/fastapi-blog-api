import { isAuthenticated, removeLocalStorage } from './authentication.js';



export function requireAuth() {
    const user = isAuthenticated();
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return user;
}

export function requireRole(requiredRole) {
    const user = requireAuth();
    if (!user) {
        return null;
    };

    const role = user.role;
    if (role !== requiredRole) {
        window.location.href = '/index.html';
        return null;
    }

    return user;
}

export function getCurrentUser() {
    return isAuthenticated();
}

export function logout() {
    removeLocalStorage('user');
    window.location.href = '/login.html';
}