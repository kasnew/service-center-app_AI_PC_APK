import { useEffect } from 'react';

type HotkeyHandler = (event: KeyboardEvent) => void;

/**
 * useHotkeys - A hook to handle keyboard shortcuts.
 * Supports layout-independent keys by checking both event.key and event.code.
 * 
 * Example usage: 
 * useHotkeys('ctrl+s', () => save())
 * useHotkeys('escape', () => close())
 */
export const useHotkeys = (keys: string, callback: HotkeyHandler) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const hotkeyParts = keys.toLowerCase().split('+');
            const hasCtrl = hotkeyParts.includes('ctrl') || hotkeyParts.includes('control');
            const hasShift = hotkeyParts.includes('shift');
            const hasAlt = hotkeyParts.includes('alt');
            const hasMeta = hotkeyParts.includes('meta') || hotkeyParts.includes('cmd');

            // The last part is the main key (e.g., 'f' in 'ctrl+f' or 'escape')
            const targetKey = hotkeyParts[hotkeyParts.length - 1];

            // Check modifiers exactly
            const ctrlMatched = event.ctrlKey === hasCtrl;
            const shiftMatched = event.shiftKey === hasShift;
            const altMatched = event.altKey === hasAlt;
            const metaMatched = event.metaKey === hasMeta;

            if (ctrlMatched && shiftMatched && altMatched && metaMatched) {
                const eventKey = event.key.toLowerCase();
                const eventCode = event.code.toLowerCase();

                // 1. Direct key match (e.g., person is on US layout and types 'f')
                const isKeyMatch = eventKey === targetKey;

                // 2. Layout-independent code match (e.g., person is on UA layout and types 'а', which is code 'KeyF')
                // Maps 'f' -> 'keyf', '1' -> 'digit1', etc.
                const isCodeMatch =
                    eventCode === targetKey ||
                    eventCode === `key${targetKey}` ||
                    eventCode === `digit${targetKey}`;

                if (isKeyMatch || isCodeMatch) {
                    // Avoid triggering if inside an input unless it's a combo like Ctrl+S
                    const isInput = event.target instanceof HTMLInputElement ||
                        event.target instanceof HTMLTextAreaElement ||
                        (event.target as HTMLElement).isContentEditable;

                    // Allow navigation/action keys even in inputs if Ctrl/Meta is pressed
                    const hasMod = event.ctrlKey || event.metaKey || event.altKey;

                    // Special case: Escape should always work unless specifically blocked
                    if (targetKey === 'escape' || hasMod || !isInput) {
                        event.preventDefault();
                        callback(event);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keys, callback]);
};
