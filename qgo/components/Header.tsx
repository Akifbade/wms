import React, { useState, useEffect, useRef } from 'react';
import { User, CustomLink, PermissionSet } from '../types';
import { RestoreIcon } from './Icons';

interface HeaderProps {
    view: string;
    currentUser: User;
    onLogout: () => void;
    onOpenModal: (modal: string) => void;
    onSetView: (view: any) => void;
    onRestore: () => void;
    customLinks: CustomLink[];
    permissions: PermissionSet;
    onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, currentUser, onLogout, onOpenModal, onSetView, onRestore, customLinks, permissions, onToggleSidebar }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const viewTitles: Record<string, string> = {
        dashboard: 'Dashboard',
        editor: 'Job File Editor',
        files: 'File Manager',
        clients: 'Client Management',
        analytics: 'Analytics Dashboard',
        pod: 'POD Management',
        settings: 'Application Settings',
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef]);

    const handleMenuClick = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    const handleLogoutClick = () => {
        onLogout();
        setIsMenuOpen(false);
    };

    const renderButtons = () => (
        <>
            {customLinks.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="btn bg-purple-600 hover:bg-purple-700 text-white text-sm">{link.name}</a>
            ))}
            
            {permissions.canManagePODs && (
                 <button onClick={() => onOpenModal('driverPerformance')} className="btn bg-teal-500 hover:bg-teal-600 text-white text-sm">Driver Dashboard</button>
            )}

            {permissions.canManageSettings && (
                <>
                    <button onClick={() => onOpenModal('linkManager')} className="btn bg-cyan-500 hover:bg-cyan-600 text-white text-sm">Links</button>
                    <button onClick={onRestore} title="Restore from backup" className="btn bg-gray-600 hover:bg-gray-700 text-white text-sm">
                        <RestoreIcon />
                        <span className="ml-2">Restore</span>
                    </button>
                </>
            )}
            {permissions.canManageUsers && (
                 <button onClick={() => onOpenModal('adminPanel')} className="btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm">Admin</button>
            )}
            <button onClick={() => onSetView('settings')} className="btn bg-slate-700 hover:bg-slate-800 text-white text-sm">Settings</button>
            <button onClick={() => onOpenModal('profile')} className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Profile</button>
            <button onClick={onLogout} className="btn bg-red-500 hover:bg-red-600 text-white text-sm">Logout</button>
        </>
    );

    const renderDropdownItems = () => (
        <>
             {customLinks.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{link.name}</a>
            ))}
            
            {permissions.canManagePODs && (
                 <button onClick={() => handleMenuClick(() => onOpenModal('driverPerformance'))} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Driver Dashboard</button>
            )}

            {permissions.canManageSettings && (
                <>
                    <button onClick={() => handleMenuClick(() => onOpenModal('linkManager'))} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Links</button>
                    <button onClick={() => handleMenuClick(onRestore)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Restore from Backup</button>
                </>
            )}
            {permissions.canManageUsers && (
                 <button onClick={() => handleMenuClick(() => onOpenModal('adminPanel'))} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Admin</button>
            )}
            <button onClick={() => handleMenuClick(() => onSetView('settings'))} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</button>
            <button onClick={() => handleMenuClick(() => onOpenModal('profile'))} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</button>
            <div className="border-t my-1"></div>
            <button onClick={handleLogoutClick} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Logout</button>
        </>
    );

    return (
        <header className="no-print flex justify-between items-center gap-4">
            <div className="flex items-center">
                <button onClick={onToggleSidebar} className="hamburger-menu md:hidden mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{viewTitles[view] || 'Job File Management'}</h1>
                    <p className="text-sm text-slate-500">Welcome, {currentUser.displayName}</p>
                </div>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
                {renderButtons()}
            </div>
            
            {/* Mobile Menu */}
            <div ref={menuRef} className="relative sm:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300 transition">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                        <div className="py-1">
                            {renderDropdownItems()}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;