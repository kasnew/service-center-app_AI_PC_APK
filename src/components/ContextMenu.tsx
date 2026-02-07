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
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1.5 min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (children) setIsSubmenuOpen(true);
    };

    const handleMouseLeave = () => {
        if (children) {
            timeoutRef.current = setTimeout(() => {
                setIsSubmenuOpen(false);
            }, 300); // 300ms grace period
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

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
                className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-slate-700/80 transition-all duration-200 ${danger ? 'text-red-400' : 'text-slate-200'
                    }`}
            >
                {icon && <span className="w-4 h-4 flex items-center justify-center opacity-80">{icon}</span>}
                <span className="flex-1 font-medium">{label}</span>
                {children && <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>

            {children && isSubmenuOpen && (
                <div className="absolute left-full top-0 -ml-1 pl-2 -mt-1 group z-50">
                    {/* Invisible bridge to prevent closing when moving mouse to submenu */}
                    <div className="absolute top-0 -left-4 w-4 h-full" />
                    <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1.5 min-w-[210px] animate-in fade-in slide-in-from-left-1 duration-200">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ContextMenuSeparator: React.FC = () => (
    <div className="h-px bg-slate-700 my-1" />
);
