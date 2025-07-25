"use client";

import React, { useState } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";

interface ProjectHeaderProps {
  project: Doc<"projects">;
  onUpdate: (updates: { name?: string; customInstructions?: string }) => void;
}

export default function ProjectHeader({ project, onUpdate }: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);

  const handleSave = () => {
    if (editedName.trim()) {
      onUpdate({
        name: editedName.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedName(project.name);
      setIsEditing(false);
    }
  };

  return (
    <div>
      {isEditing ? (
        <div className="mb-2">
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="text-3xl font-bold !text-3xl !font-bold h-auto py-1 px-2 border-none shadow-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 w-auto min-w-0 bg-accent/30 rounded-md"
            style={{ width: `${Math.max(editedName.length + 2, 10)}ch` }}
            placeholder="Project name"
            maxLength={100}
            autoFocus
          />
        </div>
      ) : (
        <div>
          <h1 
            className="text-3xl font-bold mb-2 cursor-pointer hover:text-primary hover:bg-accent/30 transition-all duration-200 px-2 py-1 rounded-md inline-block hover:scale-[1.02] hover:shadow-sm"
            onDoubleClick={() => setIsEditing(true)}
          >
            {project.name}
          </h1>
        </div>
      )}
    </div>
  );
}