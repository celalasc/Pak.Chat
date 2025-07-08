"use client";
import { Skeleton } from "./ui/skeleton";

export default function PageSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto pt-10 pb-44 space-y-12">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
