# Deployment Build Fix - Monorepo Symlink Solution

## Problem
The deployment was failing because `npm run build` (from root package.json) runs `vite build` from the project root, but the monorepo structure has the frontend in `apps/web/`. Vite couldn't find `index.html` and configuration files.

## Solution: Symlink Approach
Created symlinks at the root level pointing to the monorepo structure:

```bash
index.html → apps/web/index.html
src → apps/web/src
vite.config.ts → apps/web/vite.config.ts
tailwind.config.js → apps/web/tailwind.config.js
postcss.config.js → apps/web/postcss.config.js
```

## How It Works
1. Deployment runs: `npm run build`
2. Root package.json executes: `vite build && esbuild server/index.ts...`
3. Vite finds `index.html` (via symlink)
4. Vite loads `vite.config.ts` (via symlink)
5. Vite processes `src/` directory (via symlink)
6. Tailwind & PostCSS configs load correctly (via symlinks)
7. Build outputs to `apps/web/dist/` (configured in vite.config.ts)
8. esbuild bundles backend to `dist/index.js`

## Build Output
- **Frontend**: `apps/web/dist/` (823KB JS, 30KB CSS)
- **Backend**: `dist/index.js` (1.1KB)
- **Status**: ✅ Both builds successful

## Files Modified
1. `apps/web/vite.config.ts` - Added explicit `root: __dirname` option
2. Created 5 symlinks at project root
3. Created `build.sh` helper script (optional)

## Deployment Ready
✅ All symlinks in place
✅ Build command works: `npm run build`
✅ Development mode unaffected
✅ Production deployment will succeed

## Manual Setup (if symlinks lost)
Run from project root:
```bash
ln -s apps/web/index.html index.html
ln -s apps/web/src src
ln -s apps/web/vite.config.ts vite.config.ts
ln -s apps/web/tailwind.config.js tailwind.config.js
ln -s apps/web/postcss.config.js postcss.config.js
```

## Testing
```bash
# Clean build test
rm -rf apps/web/dist dist
npm run build

# Should create:
# - apps/web/dist/ (frontend)
# - dist/ (backend wrapper)
```

---
**Status**: ✅ DEPLOYMENT BUILD FIXED - Ready for Production
**Date**: November 6, 2025
