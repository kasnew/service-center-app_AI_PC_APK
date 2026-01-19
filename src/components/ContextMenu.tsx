import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    // Simple positioning logic to keep it on screen
    // In a real app, we might use something like floating-ui, but this is sufficient for now
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[200px]"
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body
    );
};

interface ContextMenuItemProps {
    onClick?: () => void;
    icon?: React.ReactNode;
    label: string;
    danger?: boolean;
    children?: React.ReactNode; // For submenu
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ onClick, icon, label, danger, children }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    const handleMouseEnter = () => {
        if (children) setIsSubmenuOpen(true);
    };

    const handleMouseLeave = () => {
        if (children) setIsSubmenuOpen(false);
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick();
                }}
                className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-700 transition-colors ${danger ? 'text-red-400' : 'text-slate-200'
                    }`}
            >
                {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
                <span className="flex-1">{label}</span>
                {children && <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>

            {children && isSubmenuOpen && (
                <div className="absolute left-full top-0 ml-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[200px]">
                    {children}
                </div>
            )}
        </div>
    );
};

export const ContextMenuSeparator: React.FC = () => (
    <div className="h-px bg-slate-700 my-1" />
);
