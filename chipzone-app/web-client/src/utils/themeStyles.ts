/**
 * Utility functions for applying theme styles to components
 */

export const getThemeStyles = {
  // Background colors
  bg: () => ({ backgroundColor: 'var(--theme-bg)' }),
  bgSurface: () => ({ backgroundColor: 'var(--theme-surface)' }),
  bgSurfaceSecondary: () => ({ backgroundColor: 'var(--theme-surface-secondary)' }),
  
  // Text colors
  text: () => ({ color: 'var(--theme-text)' }),
  textSecondary: () => ({ color: 'var(--theme-text-secondary)' }),
  
  // Border colors
  border: () => ({ borderColor: 'var(--theme-border)' }),
  
  // Primary colors
  primary: () => ({ color: 'var(--theme-primary)' }),
  primaryBg: () => ({ backgroundColor: 'var(--theme-primary)' }),
  primaryHover: () => ({ backgroundColor: 'var(--theme-primary-hover)' }),
  
  // Combined styles
  card: () => ({
    backgroundColor: 'var(--theme-surface)',
    borderColor: 'var(--theme-border)',
    color: 'var(--theme-text)',
  }),
  
  input: () => ({
    backgroundColor: 'var(--theme-surface-secondary)',
    borderColor: 'var(--theme-border)',
    color: 'var(--theme-text)',
  }),
  
  button: (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
    const styles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--theme-primary)',
        color: '#ffffff',
      },
      secondary: {
        backgroundColor: 'var(--theme-surface-secondary)',
        color: 'var(--theme-text)',
        borderColor: 'var(--theme-border)',
      },
      danger: {
        backgroundColor: '#dc2626',
        color: '#ffffff',
      },
    };
    return styles[variant];
  },
};

export const getThemeClasses = {
  // Background classes that use CSS variables
  bg: 'bg-[var(--theme-bg)]',
  bgSurface: 'bg-[var(--theme-surface)]',
  bgSurfaceSecondary: 'bg-[var(--theme-surface-secondary)]',
  
  // Text classes
  text: 'text-[var(--theme-text)]',
  textSecondary: 'text-[var(--theme-text-secondary)]',
  
  // Border classes
  border: 'border-[var(--theme-border)]',
  
  // Primary classes
  primary: 'text-[var(--theme-primary)]',
  primaryBg: 'bg-[var(--theme-primary)]',
};


