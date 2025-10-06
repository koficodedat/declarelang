# DeclareLang Playground

Interactive DSL editor and visualizer for DeclareLang.

**Status**: v0.1.0 - Basic Stub (Full implementation planned for v1.0.0)

## Quick Start

### Run Development Server

```bash
# From the playground directory
pnpm dev

# Or from the root
pnpm --filter @declarelang/playground dev
```

The playground will be available at: **http://localhost:5173/declarelang/**

### Build for Production

```bash
# From the playground directory
pnpm build

# Or from the root
pnpm --filter @declarelang/playground build
```

### Preview Production Build

```bash
# From the playground directory
pnpm preview

# Or from the root
pnpm --filter @declarelang/playground preview
```

## Current Status (v0.1.0)

The playground currently displays a **minimal stub application** with:

- ✅ Basic UI shell
- ✅ Textarea for DSL input
- ✅ "Coming soon in v1.0.0" message
- ✅ Build and development workflow configured

**What's Missing** (planned for v1.0.0):

- 🔄 CodeMirror integration for syntax highlighting
- 🔄 Real-time DSL parsing and validation
- 🔄 AST visualization
- 🔄 Generated code preview (Drizzle schema, Fastify routes)
- 🔄 Error display with position information
- 🔄 Example DSL templates
- 🔄 Dark/light theme toggle
- 🔄 Export functionality

## Tech Stack

- **Framework**: [SolidJS](https://www.solidjs.com/) - Reactive UI library
- **Editor**: [CodeMirror 6](https://codemirror.net/) - Code editor (ready to integrate)
- **Build Tool**: [Vite](https://vitejs.dev/) - Fast build tool
- **Language**: TypeScript

## Development

### File Structure

```
packages/playground/
├── src/
│   └── main.tsx          # Main application entry point
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Adding Features

To enhance the playground for v1.0.0:

1. **Integrate CodeMirror**:

   ```typescript
   import { EditorView, basicSetup } from 'codemirror';
   import { EditorState } from '@codemirror/state';
   ```

2. **Add DSL Parser Integration**:

   ```typescript
   import { Tokenizer, DDLParser, DMLParser } from '@declarelang/core';
   ```

3. **Implement Real-time Validation**:
   - Parse DSL on every change
   - Display errors with line/column info
   - Show AST visualization

4. **Add Code Generation Preview**:
   - Generate Drizzle schema
   - Generate Fastify routes
   - Display in split-pane view

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (outputs to `dist/`)
- `pnpm preview` - Preview production build locally
- `pnpm typecheck` - Run TypeScript type checking

## Deployment

The playground is configured for GitHub Pages deployment:

- **Base URL**: `/declarelang/` (configured in `vite.config.ts`)
- **Workflow**: `.github/workflows/playground-deploy.yml`
- **URL**: Will be available at `https://[username].github.io/declarelang/`

## Configuration

### Vite Configuration

See `vite.config.ts`:

- Base path set to `/declarelang/` for GitHub Pages
- SolidJS plugin enabled
- Source maps enabled for debugging

### TypeScript Configuration

See `tsconfig.json`:

- Strict mode enabled
- JSX configured for SolidJS
- DOM types included

## Contributing

The playground is ready for community contributions! Key areas to work on:

1. **CodeMirror Integration** - Syntax highlighting and editor features
2. **Parser Integration** - Real-time DSL parsing and validation
3. **Visualization** - AST tree view, schema preview
4. **UI/UX** - Better layout, themes, responsiveness
5. **Examples** - Template DSL files for learning

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

Same as the main DeclareLang project.

## Version History

- **v0.1.0** - Basic stub with build system configured
- **v1.0.0** (planned) - Full interactive playground with parsing and visualization
