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