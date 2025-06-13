import fs from 'fs/promises';
import path from 'path';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import whyDidYouRender from '@welldone-software/why-did-you-render';

// Storage for render count per component
const renderCounts: Record<string, number> = {};

whyDidYouRender(React, {
  trackAllPureComponents: true,
  notifier: ({ Component }) => {
    const name = (Component.displayName || Component.name || 'Unknown') as string;
    renderCounts[name] = (renderCounts[name] || 0) + 1;
  },
});

/** Recursively collect all component files under a directory */
async function collectComponents(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectComponents(fullPath)));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

(async () => {
  const componentsDir = path.join('frontend', 'components');
  const componentFiles = await collectComponents(componentsDir);

  for (const file of componentFiles) {
    try {
      const modulePath = path.resolve(file);
      const mod = await import(modulePath);
      const Component = mod.default || Object.values(mod)[0];
      if (typeof Component === 'function') {
        const element = React.createElement(Component, {});
        // Render twice to trigger potential duplicate renders
        TestRenderer.create(element);
        TestRenderer.create(element);
      }
    } catch (err) {
      console.warn(`Skipping ${file}:`, err);
    }
  }

  await fs.writeFile(
    path.join('docs', 'profiler-report.json'),
    JSON.stringify(renderCounts, null, 2)
  );
})();
