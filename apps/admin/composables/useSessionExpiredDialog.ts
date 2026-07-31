const isOpen = ref(false);

function open() {
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

export function useSessionExpiredDialog() {
  return { isOpen, open, close };
}
