"use client";

import React, { useState, useEffect, useRef } from "react";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, File, Trash, Upload, MoreHorizontal, Edit } from "lucide-react";
import { toast } from "sonner";

interface ProjectKnowledgeProps {
  files: Doc<"projectFiles">[];
  project: Doc<"projects">;
  onUpload: (name: string, content: string, fileType: string) => Promise<Id<"projectFiles"> | undefined>;
  onDelete: (fileId: Id<"projectFiles">) => Promise<void>;
  onUpdateProject: (updates: { customInstructions?: string }) => Promise<void>;
}

export default function ProjectKnowledge({ files, project, onUpload, onDelete, onUpdateProject }: ProjectKnowledgeProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileType, setFileType] = useState("txt");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [projectInstructions, setProjectInstructions] = useState(project.customInstructions || "");

  useEffect(() => {
    setProjectInstructions(project.customInstructions || "");
  }, [project.customInstructions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleUpload = async () => {
    if (!fileName.trim() || !fileContent.trim()) {
      toast.error("Please enter file name and content");
      return;
    }

    try {
      await onUpload(fileName.trim(), fileContent.trim(), fileType);
      setFileName("");
      setFileContent("");
      setFileType("txt");
      setIsUploadModalOpen(false);
      toast.success("File uploaded!");
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("File upload error");
    }
  };

  const handleDelete = async (fileId: Id<"projectFiles">) => {
    if (!confirm("Delete file? This action cannot be undone.")) {
      return;
    }

    try {
      await onDelete(fileId);
      toast.success("File deleted!");
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("File deletion error");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      setFileName(file.name);
      
      // Определяем тип файла по расширению
      const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
      setFileType(extension);
      
      setIsUploadModalOpen(true);
    };
    
    reader.readAsText(file);
  };

  const handleInstructionsSave = async () => {
    try {
      await onUpdateProject({ customInstructions: projectInstructions.trim() || undefined });
      setIsInstructionsModalOpen(false);
      toast.success("Project instructions saved!");
    } catch (error) {
      console.error("Failed to save project instructions:", error);
      toast.error("Failed to save instructions");
    }
  };

  const getPreviewText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <>
      <div className="border rounded-lg p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Project Memory</h3>
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 top-10 z-50 bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl p-2 min-w-[200px]">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.md,.json,.csv,.xml,.yaml,.yml"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    document.getElementById('file-upload')?.click();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full justify-start mb-1 text-white dark:text-white hover:bg-white/20 dark:hover:bg-white/20"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsUploadModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full justify-start text-white dark:text-white hover:bg-white/20 dark:hover:bg-white/20"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Project Instructions Tile */}
        <div 
          className="border rounded-lg p-4 mb-4 cursor-pointer hover:shadow-sm transition-shadow bg-background hover:bg-accent/50"
          style={{ height: '50px', minHeight: '50px' }}
          onClick={() => setIsInstructionsModalOpen(true)}
        >
          <div className="flex justify-between items-center h-full">
            <div className="flex-1 min-w-0">
              {project.customInstructions ? (
                <div className="text-sm text-muted-foreground truncate">
                  {getPreviewText(project.customInstructions)}
                </div>
              ) : (
                <div className="text-sm font-medium text-foreground">
                  Project instructions
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {project.customInstructions ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Optional</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {files.length === 0 ? (
            <div className="text-center p-6 border-dashed border-2 rounded-lg text-gray-500 h-full flex flex-col justify-center">
              <File className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="mb-4">No files in this project yet</p>
              <p className="text-sm text-gray-400">
                Upload files with important information for AI context
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {files.map((file) => (
                <div
                  key={file._id}
                  className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                      onClick={() => handleDelete(file._id)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    Type: {file.fileType}
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-3">
                    {file.content.substring(0, 100)}
                    {file.content.length > 100 && "..."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload File Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create File</DialogTitle>
            <DialogDescription>
              Add a file with important information for this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="File name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1"
                maxLength={100}
              />
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="txt">TXT</option>
                <option value="md">Markdown</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xml">XML</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
            <div>
              <textarea
                className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                placeholder="File content..."
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={12}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setFileName("");
                setFileContent("");
                setFileType("txt");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!fileName.trim() || !fileContent.trim()}
            >
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Instructions Modal */}
      <Dialog open={isInstructionsModalOpen} onOpenChange={setIsInstructionsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Instructions</DialogTitle>
            <DialogDescription>
              Add instructions for this project to help guide AI assistance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <textarea
                className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                placeholder="Enter project instructions..."
                value={projectInstructions}
                onChange={(e) => setProjectInstructions(e.target.value)}
                rows={12}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInstructionsModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstructionsSave}
            >
              Save Instructions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}