"use client";

import React, { useState, useMemo } from "react";
import { useProjects } from "../hooks/useProjects";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, FolderOpen, Search, Trash, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProjectsDropdownProps {
  selectedProjectId?: Id<"projects">;
  onProjectSelect?: (projectId: Id<"projects">) => void;
}

export function ProjectsDropdown({
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
  const filteredProjects = useMemo(() => {
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
      // Navigate to the newly created project
      if (projectId) {
        router.push(`/project/${projectId}`);
      }
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
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const handleDeleteProject = async (projectId: Id<"projects">) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleProjectSelect = (projectId: Id<"projects">) => {
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      router.push(`/project/${projectId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-full"></div>
          <div className="h-6 bg-gray-200 rounded w-full"></div>
          <div className="h-6 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <FolderOpen className="mr-2 h-4 w-4" />
            Projects
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <div className="max-h-64 overflow-y-auto">
            {/* New Project Creation Tile */}
            {isCreatingNewProject && (
              <div className="flex items-center group p-2">
                <DropdownMenuItem className="flex-1 cursor-default" onClick={(e) => e.preventDefault()}>
                  <div className="flex-1">
                    <Input
                      autoFocus
                      placeholder="Project name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={() => {
                        if (!newProjectName.trim()) {
                          handleCancelCreating();
                        }
                      }}
                      className="h-8 text-sm"
                      maxLength={100}
                    />
                  </div>
                </DropdownMenuItem>
              </div>
            )}
            
            {/* Existing Projects */}
            {filteredProjects.length === 0 && !isLoading && !isCreatingNewProject ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? "No projects found" : "You don't have any projects yet"}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div key={project._id} className="flex items-center group">
                  <DropdownMenuItem
                    className="flex-1 cursor-pointer"
                    onClick={() => handleProjectSelect(project._id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                      {project.customInstructions && (
                        <div className="text-sm text-muted-foreground truncate">
                          {project.customInstructions}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete project?")) {
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
          </div>

          {hasMore && (
            <DropdownMenuItem onClick={() => loadMore(10)}>
              Load more...
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
<DropdownMenuItem onClick={handleStartCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </DropdownMenuItem>
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