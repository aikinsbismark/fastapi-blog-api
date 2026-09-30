export function getErrorMessage(error) {
    if (!error) {
        return 'Something went wrong. Please try again.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (Array.isArray(error.detail)) {
        return error.detail.map(item => item.msg).filter(Boolean).join(' ');
    }

    if (typeof error.detail === 'string') {
        return error.detail;
    }

    if (typeof error.message === 'string') {
        return error.message;
    }

    return 'Something went wrong. Please try again.';
}