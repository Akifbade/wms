import React from 'react';
import { getBackendUrl } from '../services/api';

interface ShipmentPhotoProps {
    photoUrl: string;
    index: number;
    status?: 'RELEASED' | 'ACTIVE' | 'PARTIAL' | 'IN_STORAGE';
    className?: string;
    onClick?: () => void;
    showStamp?: boolean; // Show "RELEASED" stamp overlay
}

/**
 * ShipmentPhoto Component
 * Displays shipment photos with optional "RELEASED" stamp watermark
 * Photos are preserved after release with visual indicator
 */
export const ShipmentPhoto: React.FC<ShipmentPhotoProps> = ({
    photoUrl,
    index,
    status,
    className = '',
    onClick,
    showStamp = true,
}) => {
    // Fix: Prepend backend URL if photo path is relative
    const fullPhotoUrl = photoUrl.startsWith('http') ? photoUrl : `${getBackendUrl()}${photoUrl}`;

    const isReleased = status === 'RELEASED';

    return (
        <div className={`relative group ${className}`}>
            <img
                src={fullPhotoUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border-2 border-gray-300 hover:border-indigo-500 cursor-pointer transition-all hover:scale-105"
                onClick={onClick || (() => window.open(fullPhotoUrl, '_blank'))}
            />

            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                <svg
                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                </svg>
            </div>

            {/* Photo number badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs px-1 py-0.5 rounded-b-lg text-center">
                {index + 1}
            </div>

            {/* RELEASED stamp watermark - diagonal overlay */}
            {showStamp && isReleased && (
                <>
                    {/* Semi-transparent overlay for better stamp visibility */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg pointer-events-none" />

                    {/* RELEASED stamp - diagonal red stamp effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className="transform -rotate-12"
                            style={{
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                            }}
                        >
                            <div className="relative">
                                {/* Stamp border */}
                                <div className="border-4 border-red-600 rounded-lg px-3 py-2 bg-white bg-opacity-90">
                                    <span className="text-red-600 font-bold text-lg tracking-wider uppercase">
                                        RELEASED
                                    </span>
                                </div>
                                {/* Additional stamp effect - double border */}
                                <div className="absolute inset-0 border-2 border-red-500 rounded-lg m-0.5 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Alternative: Badge style for PARTIAL/ACTIVE status */}
            {showStamp && status === 'PARTIAL' && (
                <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    PARTIAL
                </div>
            )}
        </div>
    );
};
