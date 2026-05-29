# How to use this package with Codex

1. Create or open a GitHub repository, for example:

```text
ocean-chronicle-game/
```

2. Copy these files into the repository root:

```text
AGENTS.md
README_CODEX_IMPORT.md
docs/
public/assets/
```

3. Place image and video assets into `public/assets/` according to `docs/07_ASSET_MANIFEST.md`.

4. Ask Codex to start with this prompt:

```text
Read AGENTS.md and all files in docs/.
Build the first playable MVP for 《海洋戰紀：異變追跡》.
Use Vite + React + TypeScript.
Create a mobile-first 9:16 browser game with:
- title screen
- episode map
- character gallery
- first combat stage: 雙帶武士 vs 巨大垃圾海葵・紫色觸手模式
- victory unlock card: 食人鯊石像
Use assets from public/assets/.
Keep the code modular and run npm run build when finished.
```

5. After the first version runs, ask Codex for incremental tasks only:

- Improve combat feel.
- Add boss attack patterns.
- Add episode unlock flow.
- Add character gallery filters.
- Add story cards.
- Add GitHub Pages deployment.

Do not ask for the entire final game at once.
