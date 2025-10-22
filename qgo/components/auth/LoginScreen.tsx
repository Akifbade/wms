import React, { useState } from 'react';
import { User } from '../../types';
import * as authService from '../../services/authService';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    showNotification: (message: string, isError?: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users, setUsers, showNotification }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoginView) {
            const result = authService.login(email, password, users);
            if (result.success && result.user) {
                onLogin(result.user);
                showNotification(result.message);
            } else {
                showNotification(result.message, true);
            }
        } else {
            if (!fullName) {
                showNotification("Full Name is required for sign up.", true);
                return;
            }
            const result = authService.register(email, password, fullName, users);
            showNotification(result.message, !result.success);
            if (result.success) {
                setUsers(result.users);
                setIsLoginView(true); // Switch to login view after successful registration
            }
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
                <source src="https://cdn.pixabay.com/video/2019/05/12/23544-335833111_large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40"></div>

            <div className="max-w-md w-full space-y-8 z-10">
                <div>
                    <img src="http://qgocargo.com/logo.png" alt="QGO Cargo Logo" className="mx-auto h-28 w-auto drop-shadow-lg" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        {isLoginView ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6 glass-card p-8 rounded-2xl shadow-2xl border border-white/30" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        {!isLoginView && (
                            <div className="mb-4">
                                <label htmlFor="full-name" className="sr-only">Full Name</label>
                                <input id="full-name" value={fullName} onChange={e => setFullName(e.target.value)} name="name" type="text" autoComplete="name" required className="input-field" placeholder="Full Name" />
                            </div>
                        )}
                        <div className="mb-4">
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input id="email-address" value={email} onChange={e => setEmail(e.target.value)} name="email" type="email" autoComplete="email" required className="input-field" placeholder="Email address" />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input id="password" value={password} onChange={e => setPassword(e.target.value)} name="password" type="password" autoComplete={isLoginView ? "current-password" : "new-password"} required className="input-field" placeholder="Password" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {isLoginView ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                    <p className="mt-2 text-center text-sm text-gray-200">
                        <button type="button" onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-indigo-400 hover:text-indigo-300 bg-transparent border-none">
                            {isLoginView ? 'Create a new account' : 'Already have an account? Sign in'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;