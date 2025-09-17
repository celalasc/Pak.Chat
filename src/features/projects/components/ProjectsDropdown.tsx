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
} from "@/frontend/components/ui/dropdown-menu";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Plus, FolderOpen, Search, Trash } from "lucide-react";
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
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState("");
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


    </>
  );
}