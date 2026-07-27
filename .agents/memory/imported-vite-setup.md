---
name: Imported Vite setup
description: Environment note for imported Vite projects whose dependencies are not installed yet.
---

Imported Vite projects may have a valid package manifest and workflow but no installed `node_modules`, causing the first preview to fail with `vite: not found`.

**Why:** Repository imports can omit generated dependency directories while the workflow starts immediately.

**How to apply:** If the initial workflow fails with a missing executable, install the manifest dependencies before changing the run command or project structure.

Published builds also cannot resolve Replit-only `package-firewall.replit.local` URLs in a committed npm lockfile.

**Why:** The development package firewall registry is not available in external build environments, where npm can fail with the vague `Exit handler never called` message.

**How to apply:** Before publishing, ensure `package-lock.json` resolves packages through `https://registry.npmjs.org/` (or the target build environment's public registry), then verify with a clean install.