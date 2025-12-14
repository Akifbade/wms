import React, { useState } from 'react';

interface IconPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (icon: string) => void;
    currentIcon?: string;
}

const WAREHOUSE_ICONS = [
    { icon: '📦', label: 'Box' },
    { icon: '🏭', label: 'Warehouse' },
    { icon: '🚛', label: 'Truck' },
    { icon: '📍', label: 'Location' },
    { icon: '🏢', label: 'Building' },
    { icon: '🔧', label: 'Tools' },
    { icon: '❄️', label: 'Cold Storage' },
    { icon: '🌡️', label: 'Temperature' },
    { icon: '📊', label: 'Analytics' },
    { icon: '🎯', label: 'Target' },
    { icon: '🔒', label: 'Secure' },
    { icon: '⚡', label: 'Fast' },
    { icon: '🏭', label: 'Factory' },
    { icon: '📋', label: 'Clipboard' },
    { icon: '🗂️', label: 'Files' },
    { icon: '📐', label: 'Measure' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '🔨', label: 'Hammer' },
    { icon: '🧰', label: 'Toolbox' },
    { icon: '🚚', label: 'Delivery' },
    { icon: '📦', label: 'Package' },
    { icon: '🏗️', label: 'Construction' },
    { icon: '🏪', label: 'Store' },
    { icon: '🎪', label: 'Tent' },
    { icon: '⛺', label: 'Camp' },
    { icon: '🏕️', label: 'Camping' },
    { icon: '🏬', label: 'Department' },
    { icon: '🏯', label: 'Castle' },
    { icon: '🏰', label: 'Fortress' },
    { icon: '🗄️', label: 'Cabinet' },
    { icon: '🗃️', label: 'Card File' },
    { icon: '📁', label: 'Folder' },
    { icon: '📂', label: 'Open Folder' },
    { icon: '🗂️', label: 'Dividers' },
    { icon: '📚', label: 'Books' },
    { icon: '📖', label: 'Book' },
    { icon: '📕', label: 'Red Book' },
    { icon: '📗', label: 'Green Book' },
    { icon: '📘', label: 'Blue Book' },
    { icon: '📙', label: 'Orange Book' },
    { icon: '🔲', label: 'Square' },
    { icon: '🔳', label: 'White Square' },
    { icon: '▪️', label: 'Small Square' },
    { icon: '▫️', label: 'Small White Square' },
    { icon: '🔴', label: 'Red Circle' },
    { icon: '🟠', label: 'Orange Circle' },
    { icon: '🟡', label: 'Yellow Circle' },
    { icon: '🟢', label: 'Green Circle' },
    { icon: '🔵', label: 'Blue Circle' },
    { icon: '🟣', label: 'Purple Circle' },
    { icon: '🟤', label: 'Brown Circle' },
    { icon: '⚫', label: 'Black Circle' },
    { icon: '⚪', label: 'White Circle' },
];

const IconPickerModal: React.FC<IconPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentIcon = '📦',
}) => {
    const [selectedIcon, setSelectedIcon] = useState(currentIcon);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredIcons = WAREHOUSE_ICONS.filter(item =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = () => {
        onSelect(selectedIcon);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">🎨 Choose Zone Icon</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-blue-100 text-sm mt-1">
                        Select an icon to represent this zone
                    </p>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b">
                    <input
                        type="text"
                        placeholder="🔍 Search icons... (e.g., box, warehouse, truck)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Icon Grid */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                        {filteredIcons.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedIcon(item.icon)}
                                className={`
                  aspect-square flex flex-col items-center justify-center
                  rounded-lg border-2 transition-all
                  hover:scale-110 hover:shadow-lg
                  ${selectedIcon === item.icon
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-blue-300'
                                    }
                `}
                                title={item.label}
                            >
                                <span className="text-2xl md:text-3xl">{item.icon}</span>
                                <span className="text-[8px] md:text-[10px] text-gray-600 mt-1 truncate w-full px-1 text-center">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {filteredIcons.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <span className="text-4xl">🔍</span>
                            <p className="mt-2">No icons found</p>
                            <p className="text-sm">Try a different search term</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Selected:</span>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-blue-500 rounded-lg">
                            <span className="text-3xl">{selectedIcon}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Select Icon
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IconPickerModal;
