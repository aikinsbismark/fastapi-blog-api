import { config } from '../js/config.js';


const signupEndpoint = {
   admin:  `${config.API_BASE_URL}/admin/`,
   author: `${config.API_BASE_URL}/author/signup`,
   user: `${config.API_BASE_URL}/user/create_account`
};


const loginEndpoints = {
    admin: `${config.API_BASE_URL}/admin/login`,
    author: `${config.API_BASE_URL}/author/login`,
    user: `${config.API_BASE_URL}/user/token`
};


const changePasswordPoints = {
    admin: `${config.API_BASE_URL}/admin/me/password`,
    author: `${config.API_BASE_URL}/author/me/password`,
    user: `${config.API_BASE_URL}/user/me/password`
};


const forgotPasswordEndpoints = {
    admin: `${config.API_BASE_URL}/admin/forgot-password`,
    author: `${config.API_BASE_URL}/author/forgot-password`,
    user: `${config.API_BASE_URL}/user/forgot-password`
};


const resetPasswordEndpoints = {
    admin: `${config.API_BASE_URL}/admin/reset-password`,
    author: `${config.API_BASE_URL}/author/reset-password`,
    user: `${config.API_BASE_URL}/user/reset-password`
};


export const extractToken = (storedUser) => {
    return storedUser?.access_token ?? storedUser?.token ?? storedUser?.jwt ?? null;
};



export const signup = async (user, role) => {
    const url = signupEndpoint[role];
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    });

    let data = {}

    try {
        data = await response.json();
    } catch (error) {
        console.error("Unable to parse response.");
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};

export const login = async (user, role) => {
    const url = loginEndpoints[role];
    const body = new URLSearchParams();
    body.append('username', user.username);
    body.append('password', user.password);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    let data = {}

    try {
        data = await response.json();
    } catch (error) {
        console.error("Unable to parse response.");
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};

export const getCurrentAuthor = async (token) => {
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${config.API_BASE_URL}/author/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            return null;
        }
        
        const author = await response.json();

        return author;

    } catch (error) {
        console.error('Failed to verify author:', error);
        return null;
    }
};

export const getCurrentAdmin = async (token) => {
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${config.API_BASE_URL}/admin/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        const admin = await response.json();

        return admin;

    } catch (error) {
        console.error('Failed to verify admin.', error);
        return null;
    }
};

export const getCurrentUser = async (token) => {
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${config.API_BASE_URL}/user/me`, {
            headers :{
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            return null;
        }

        const currentUser = await response.json();
        
        return currentUser;

    } catch (error) {
        console.error("Failed to verify user:", error);
        return null;
    }
};


export const changePassword = async(token, role, currentPassword, newPassword) => {
    const url = changePasswordEndPoints[role];
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });

    try {
        data = await response.json();
    } catch (error) {
        console.error("Unable to parse response.");
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};


export const forgotPassword = async(email, role) => {
    const url = forgotPasswordPoints[role];
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_address: email })
    });

    try {
        data = await response.json();
    } catch (error) {
        console.error("Unable to parse response.");
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};


export const resetPassword = async(token, role, newPassword) => {
    const url = resetPasswordEndPoints[role];
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword })
    });

    try {
        data = await response.json();
    } catch (error) {
        console.error("Unable to parse response.");
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};




export const setLocalStorage = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
}

export const removeLocalStorage = (key) => {
    localStorage.removeItem(key);
}

export const authenticate = (data, next) => {
    setLocalStorage('user', data.user);
    next();
}

export const isAuthenticated = () => {
    if(localStorage.getItem('user')) {
        return JSON.parse(localStorage.getItem('user'))
    } else {
        return false;
    }
}