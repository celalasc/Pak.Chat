// Main component
export { default as ChatInput } from './ChatInput';
export { default } from './ChatInput';

// Sub-components
export { ImageGenerationControls } from './components/ImageGenerationControls';
export * from './components/ActionButtons';
export * from './components/ModelDropdown';
export * from './components/TextArea';

// Hooks
export * from './hooks/useChatSubmit';
export * from './hooks/useDragDrop';
export * from './hooks/useFileUpload';
export * from './hooks/useImagePaste';

// Utils
export * from './utils/fileHelpers';
export * from './utils/imageConversion';
export * from './utils/messageHelpers';
