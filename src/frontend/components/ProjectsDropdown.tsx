"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FolderOpen, Plus, Edit, Trash, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { Id } from '../../../convex/_generated/dataModel';

interface ProjectsDropdownProps {
  children: React.ReactNode;
  selectedProjectId?: Id<"projects">;
  onProjectSelect?: (projectId: Id<"projects">) => void;
}

export default function ProjectsDropdown({
  children,
  selectedProjectId,
  onProjectSelect,
}: ProjectsDropdownProps) {
  const {
    projects,
    isLoading,
    loadMore,
    hasMore,
    createProject,
    deleteProject,
    updateProject,
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{
    id: Id<"projects">;
    name: string;
    customInstructions?: string;
  } | null>(null);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const router = useRouter();

  // Фильтрация проектов по поисковому запросу
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const projectId = await createProject(
        newProjectName.trim(),
        undefined
      );
      setNewProjectName("");
      setIsCreatingNewProject(false);
      // Не перенаправляем, просто создаём проект и он появится в списке
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsCreatingNewProject(false);
    }
  };

  const handleStartCreating = () => {
    setIsCreatingNewProject(true);
    setNewProjectName("");
  };

  const handleCancelCreating = () => {
    setIsCreatingNewProject(false);
    setNewProjectName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject();
    } else if (e.key === 'Escape') {
      handleCancelCreating();
    }
  };

  const handleEditProject = async () => {
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      await updateProject(editingProject.id, {
        name: editingProject.name.trim(),
        customInstructions: editingProject.customInstructions?.trim() || undefined,
      });
      setEditingProject(null);
      setIsEditModalOpen(false);
      toast.success("Project updated!");
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: Id<"projects">) => {
    try {
      await deleteProject(projectId);
      toast.success("Project deleted!");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleProjectSelect = (projectId: Id<"projects">) => {
    setIsOpen(false);
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      router.push(`/project/${projectId}`);
    }
  };

  const renderProjectsList = () => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
        <FolderOpen className="w-3 h-3" />
        Projects
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Create Project Button */}
      <div 
        className="flex items-center gap-3 cursor-pointer group rounded-xl p-3 hover:bg-accent transition-all duration-200"
        onClick={handleStartCreating}
      >
        <div className="flex-shrink-0">
          <div className="bg-muted rounded-xl border border-border flex items-center justify-center w-10 h-10">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Create Project</p>
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-2 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* New Project Creation Tile (appears as first project when creating) */}
          {isCreatingNewProject && (
            <div className="flex items-center group rounded-xl hover:bg-accent project-creation-tile">
              <div className="flex items-center gap-3 flex-1 p-3">
                <div className="flex-shrink-0">
                  <div className="bg-muted rounded-xl border border-border flex items-center justify-center w-10 h-10">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    autoFocus
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={(e) => {
                      // Проверяем, что клик был не внутри самой плитки
                      const currentTarget = e.currentTarget;
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      
                      // Если фокус переходит на элемент вне плитки
                      if (!currentTarget.closest('.project-creation-tile')?.contains(relatedTarget)) {
                        if (!newProjectName.trim()) {
                          handleCancelCreating();
                        } else {
                          // Если есть текст, создаем проект
                          handleCreateProject();
                        }
                      }
                    }}
                    className="font-medium text-sm border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Existing Projects */}
          {filteredProjects.length === 0 && !isCreatingNewProject ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? "No projects found" : "You don't have any projects yet"}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div key={project._id} className="flex items-center group rounded-xl hover:bg-accent">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 p-3"
                  onClick={() => handleProjectSelect(project._id)}
                >
                  <div className="flex-shrink-0">
                    <div className="bg-muted rounded-xl border border-border flex items-center justify-center w-10 h-10">
                      <FolderOpen className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    {project.customInstructions && (
                      <p className="text-xs text-muted-foreground truncate">
                        {project.customInstructions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject({
                        id: project._id,
                        name: project.name,
                        customInstructions: project.customInstructions,
                      });
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete project? This action cannot be undone.")) {
                        handleDeleteProject(project._id);
                      }
                    }}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => loadMore(10)}
              >
                Load more...
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="group">
            {children}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          side="right"
          className="w-80 overflow-hidden p-2 bg-popover/95 backdrop-blur-sm shadow-lg rounded-xl border-border"
          style={{ 
            minHeight: '320px',
            maxHeight: '480px'
          }}
          sideOffset={8}
          alignOffset={0}
        >
          <div 
            className="overflow-y-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              height: '460px'
            }}
          >
            {renderProjectsList()}
          </div>
          <style jsx global>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Edit Project Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Change the project name or instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Project name"
                value={editingProject?.name || ""}
                onChange={(e) =>
                  setEditingProject((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                maxLength={100}
              />
            </div>
            <div>
              <textarea
                className="w-full p-2 border rounded-md resize-none"
                placeholder="AI instructions (optional)"
                value={editingProject?.customInstructions || ""}
                onChange={(e) =>
                  setEditingProject((prev) =>
                    prev ? { ...prev, customInstructions: e.target.value } : null
                  )
                }
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProject}
              disabled={!editingProject?.name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}