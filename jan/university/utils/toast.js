export function toast(message, type = 'success') {
  const event = new CustomEvent('show-toast', { detail: { message, type } });
  window.dispatchEvent(event);
}
