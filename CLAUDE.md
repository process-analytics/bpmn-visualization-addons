# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project provides add-ons for [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js). It extends the base `BpmnVisualization` class to support a plugin system and provides utility functions for working with BPMN elements.

## Monorepo Structure

This is an npm workspaces monorepo with 3 packages:
- `packages/addons`: The main library package (`@process-analytics/bpmn-visualization-addons`)
- `packages/demo`: Demo application using Vite, showcasing the addons functionality
- `packages/check-ts-support`: TypeScript support validation utilities

## Common Commands

### Development
- `npm install` - Install all dependencies for all workspaces
- `npm run dev:demo` - Develop the library and demo simultaneously with live updates (demo at http://localhost:5173/)
- `npm run dev -w packages/addons` - Build the addons library in watch mode
- `npm run dev -w packages/demo` - Run the demo in development mode

### Building
- `npm run build -w packages/addons` - Build the addons library (outputs to `packages/addons/lib/`)
- `npm run build -w packages/demo` - Build the demo application

### Testing
- `npm test -w packages/addons` - Run all tests
- `npm test -w packages/addons -- <test-file-path>` - Run a specific test file
- `npm run test-check -w packages/addons` - Type-check test files without running them

### Linting
- `npm run lint` - Lint and auto-fix all files
- `npm run lint-check` - Lint check without fixing

### Cleaning
- `npm run clean -w packages/addons` - Remove the `lib/` directory

## Core Architecture

### Plugin System

The central architectural concept is the **plugin system**. This package extends the `BpmnVisualization` class from `bpmn-visualization` to support plugins:

1. **Base Extension**: `packages/addons/src/plugins-support.ts` defines:
   - `BpmnVisualization` class that extends the base `BpmnVisualization` from `bpmn-visualization`
   - `Plugin` interface that all plugins must implement
   - `PluginConstructor` type for plugin constructor signatures
   - `GlobalOptions` type that extends base options with plugin support

2. **Plugin Lifecycle**:
   - Plugins are passed to `BpmnVisualization` constructor via `options.plugins` array
   - Each plugin is constructed with `(bpmnVisualization, options)` parameters
   - Plugins must implement `getPluginId()` to return a unique identifier
   - Plugins can optionally implement `configure(options)` for post-construction setup
   - Retrieve plugins using `bpmnVisualization.getPlugin<PluginType>(pluginId)`

3. **Available Plugins** (in `packages/addons/src/plugins/`):
   - `CssClassesPlugin`: Manipulate CSS classes on BPMN elements
   - `ElementsPlugin`: Retrieve `BpmnElement` and `BpmnSemantic` objects
   - `OverlaysPlugin`: Manage overlays on BPMN elements (enhanced with show/hide)
   - `StylePlugin`: Manipulate styles of BPMN elements
   - `StyleByNamePlugin`: Style manipulation by element name (not just ID)

### Other Utilities

Located in `packages/addons/src/`:
- `bpmn-elements.ts`: `BpmnElementsSearcher` (find elements by name) and `BpmnElementsIdentifier` (identify BPMN element types)
- `paths.ts`: `PathResolver` and `CasePathResolver` for inferring BPMN paths from completed/pending elements

### Test Structure

Tests use Jest with jsdom environment:
- Test files: `packages/addons/test/spec/**/*.test.ts`
- Test fixtures: `packages/addons/test/fixtures/`
- Shared test utilities: `packages/addons/test/shared/`
- Configuration: `packages/addons/jest.config.js`
- Uses `@swc/jest` for fast TypeScript transformation

## Key Concepts

### ES Modules
- All packages use `"type": "module"` in package.json
- Import statements must include `.js` extension even for `.ts` files (e.g., `import { foo } from './bar.js'`)
- Jest configuration includes moduleNameMapper to handle this

### TypeScript Configuration
- Target: ES2017
- Module: ES2015
- Strict mode enabled
- Declaration files generated in `lib/` alongside compiled JS
- `stripInternal: true` - JSDoc `@internal` items not in declarations

### Peer Dependencies
The addons package has `bpmn-visualization` as a peer dependency. This means:
- Users must install both `bpmn-visualization` and `@process-analytics/bpmn-visualization-addons`
- Import `BpmnVisualization` from addons to use plugins, NOT from `bpmn-visualization` directly
- The compatible version range is defined in `packages/addons/package.json` peerDependencies

## Important Notes

When modifying code:
- Maintain ES module import syntax with `.js` extensions
- All new plugins must implement the `Plugin` interface from `plugins-support.ts`
- Plugin IDs must be unique across all registered plugins
- Test files should be placed in `test/spec/` mirroring the `src/` structure
- Use descriptive variable names and comment only complex code
