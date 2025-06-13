# React Profiling Report

The `pnpm run profiling` command mounts each component with React Test Renderer while `why-did-you-render` tracks unnecessary re-renders. Results are written to **profiler-report.json**.

The JSON maps component names to the number of times they re-rendered with identical props during profiling. If no issues are detected the file will be empty.
