import { User } from '../types';
import { simpleHash } from './utils';

const USERS_KEY = 'qgo_users';
const SESSION_KEY = 'qgo_currentUser';


// --- Public Auth API ---
export const register = (email: string, password: string, displayName: string, currentUsers: User[]): { success: boolean, message: string, users: User[] } => {
    const users = [...currentUsers];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'An account with this email already exists.', users: currentUsers };
    }

    const isFirstUser = users.length === 0;
    const newUser: User = {
        uid: `user-${Date.now()}`,
        email,
        displayName,
        password: simpleHash(password),
        role: isFirstUser ? 'admin' : 'user',
        status: isFirstUser ? 'active' : 'inactive',
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const message = isFirstUser ? 'Admin account created successfully!' : 'Account created! Please wait for admin approval.';
    return { success: true, message, users };
};

export const login = (email: string, password: string, currentUsers: User[]): { success: boolean, message: string, user?: User } => {
    const user = currentUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== simpleHash(password)) {
        return { success: false, message: 'Invalid email or password.' };
    }

    if (user.status === 'inactive') {
        return { success: false, message: 'Your account is awaiting admin approval.' };
    }

    if (user.status === 'blocked') {
        return { success: false, message: 'Your account has been blocked.' };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, message: 'Login successful!', user };
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    const userJson = localStorage.getItem(SESSION_KEY);
    return userJson ? JSON.parse(userJson) : null;
};

export const updateCurrentUserInSession = (user: User) => {
    const sessionUser = getCurrentUser();
    if(sessionUser && sessionUser.uid === user.uid) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
}

export const changePassword = (uid: string, currentPassword: string, newPassword: string, currentUsers: User[]): {success: boolean, message: string, users?: User[]} => {
    const users = [...currentUsers];
    const userIndex = users.findIndex(u => u.uid === uid);
    
    if (userIndex === -1) {
        return { success: false, message: 'User not found.' };
    }
    const user = users[userIndex];

    if (!user.password || user.password !== simpleHash(currentPassword)) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    users[userIndex] = { ...user, password: simpleHash(newPassword) };
    
    // Also update session if it's the current user
    updateCurrentUserInSession(users[userIndex]);

    return { success: true, message: 'Password changed successfully.', users };
}