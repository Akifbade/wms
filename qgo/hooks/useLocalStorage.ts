import React, { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            
            // Special seeding logic for users to prevent being locked out with an empty user list.
            if (key === 'qgo_users') {
                const users = item ? JSON.parse(item) : null;
                // If there are no users stored (or the stored value is invalid/empty), use the initial (mock) data.
                if (!users || !Array.isArray(users) || users.length === 0) {
                    return initialValue; 
                }
                return users;
            }
            
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            } catch (error) {
                console.error(`Error setting localStorage key “${key}”:`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export default useLocalStorage;
