type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
};

let nextId = 0;
const toasts = ref<ToastItem[]>([]);

function addToast(type: ToastType, message: string, duration = 4000) {
  const id = nextId++;
  toasts.value.push({ id, type, message, duration });
  setTimeout(() => removeToast(id), duration);
}

function removeToast(id: number) {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) toasts.value.splice(index, 1);
}

export function useToast() {
  return {
    toasts,
    showSuccess: (message: string, duration?: number) => addToast('success', message, duration),
    showError: (message: string, duration?: number) => addToast('error', message, duration),
    showInfo: (message: string, duration?: number) => addToast('info', message, duration),
    remove: removeToast,
  };
}
