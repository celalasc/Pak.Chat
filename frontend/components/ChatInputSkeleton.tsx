"use client";
import { Skeleton } from "./ui/skeleton";

export default function ChatInputSkeleton() {
  return (
    <div className="fixed bottom-0 w-full max-w-3xl pb-safe">
      <div className="bg-secondary p-4 rounded-t-[20px] flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
