import React from 'react';

const NewChatIcon: React.FC = () => {
  return (
    <div className="w-8 h-8 flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors rounded-full cursor-pointer">
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
      >
        <path 
          d="M12 5V19M5 12H19" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default NewChatIcon; 