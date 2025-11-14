import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

export interface ToastActionElement {
  altText: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { id, title, description, variant };
      
      setToasts((prev) => [...prev, newToast]);
      
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
      
      return {
        id,
        dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        update: (props: Partial<Toast>) => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...props } : t))
          );
        },
      };
    },
    []
  );

  const dismiss = useCallback((toastId?: string) => {
    setToasts((prev) => (toastId ? prev.filter((t) => t.id !== toastId) : []));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
