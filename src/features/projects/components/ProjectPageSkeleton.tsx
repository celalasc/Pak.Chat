export default function ProjectPageSkeleton() {
  return (
    <div className="p-8 max-w-4xl mx-auto animate-pulse">
      {/* Скелетон для заголовка проекта */}
      <div className="border-b pb-6 mb-8">
        <div className="h-10 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Скелетон для секции "Знания" */}
      <div className="border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-gray-200 rounded"></div>
            <div className="h-9 w-28 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}