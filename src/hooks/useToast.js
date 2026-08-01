import { useContext } from 'react';
import { ToastContext } from '@/app/providers/contexts.js';

/** Fire transient feedback toasts: `toast('Saqlandi', 'success')`. */
export function useToast() {
  return useContext(ToastContext).toast;
}
