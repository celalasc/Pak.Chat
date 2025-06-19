export {};

declare global {
  interface Window {
    __hideGlobalLoader?: () => void;
  }
}
