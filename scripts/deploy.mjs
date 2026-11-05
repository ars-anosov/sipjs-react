#!/usr/bin/env node
// Публикация сборки на GitHub Pages: https://ars-anosov.github.io/sipjs-react/
//
// Источник GitHub Pages — ветка gh-pages (Settings → Pages). Скрипт пересобирает её целиком
// «сиротой» (без истории) из уже существующих файлов:
//   /          — приложение (dist/)
//   /archify/  — интерактивные archify-диаграммы (docs/archify из HEAD)
//   /docs/     — оглавление документации (docs/index.html)
//   /.nojekyll — отключает обработку Jekyll
// Ветка генерируется заново, поэтому push принудительный; main и рабочее дерево не меняются.
//
// Флаги: --no-build (не пересобирать dist), --dry-run (показать план без перезаписи ветки),
// --allow-dirty (разрешить незакоммиченные правки отслеживаемых файлов).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(repoRoot, "dist");
const flags = new Set(process.argv.slice(2));
const skipBuild = flags.has("--no-build");
const dryRun = flags.has("--dry-run");
const allowDirty = flags.has("--allow-dirty");

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

// stdio: "inherit" (сборка) не отдаёт stdout — такой вызов возвращает "".
const run = (command, commandArgs, options = {}) => {
  const output = execFileSync(command, commandArgs, { cwd: repoRoot, encoding: "utf8", ...options });
  return typeof output === "string" ? output.trim() : "";
};
const git = (commandArgs, options = {}) => run("git", commandArgs, options);

// 1. Проверки: деплоится то, что лежит в коммите (dist собирается из рабочего дерева).
if (!allowDirty) {
  const dirty = git(["status", "--porcelain", "--untracked-files=no"]);
  if (dirty) {
    fail(`Есть незакоммиченные изменения — закоммитьте их или используйте --allow-dirty:\n${dirty}`);
  }
}

// 2. Сборка.
if (!skipBuild) {
  console.log("→ vite build");
  run(process.execPath, [join(repoRoot, "node_modules/vite/bin/vite.js"), "build"], {
    stdio: "inherit",
  });
}
if (!existsSync(join(distDir, "index.html"))) {
  fail("Нет dist/index.html — сборка не удалась (или нужен npm install).");
}

// 3. Состав публикуемого дерева.
const staged = [];
const collectDist = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) collectDist(abs);
    else if (entry.isFile()) {
      staged.push({ repoPath: relative(distDir, abs).split(sep).join("/"), abs });
    }
  }
};
collectDist(distDir);

for (const repoPath of git(["ls-tree", "-r", "--name-only", "-z", "HEAD", "--", "docs/archify"]).split("\0")) {
  if (!repoPath) continue;
  staged.push({ repoPath: repoPath.replace(/^docs\//, ""), abs: join(repoRoot, repoPath) });
}

const docsLanding = join(repoRoot, "docs/index.html");
if (existsSync(docsLanding)) staged.push({ repoPath: "docs/index.html", abs: docsLanding });

// 4. Дерево и коммит — через отдельный индекс, без checkout и worktree.
const tempDir = mkdtempSync(join(tmpdir(), "sipjs-react-deploy-"));
const nojekyll = join(tempDir, ".nojekyll");
writeFileSync(nojekyll, "");
staged.push({ repoPath: ".nojekyll", abs: nojekyll });
staged.sort((a, b) => a.repoPath.localeCompare(b.repoPath));

try {
  const gitEnv = { ...process.env, GIT_INDEX_FILE: join(tempDir, "index") };
  git(["read-tree", "--empty"], { env: gitEnv });
  for (const file of staged) {
    const blob = git(["hash-object", "-w", "--", file.abs], { env: gitEnv });
    git(["update-index", "--add", "--cacheinfo", `100644,${blob},${file.repoPath}`], { env: gitEnv });
  }
  const tree = git(["write-tree"], { env: gitEnv });

  const version = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;
  const message = `deploy: сборка sipjs-react v${version}\n\nПриложение в корне, документация — /docs/ и /archify/.`;

  if (dryRun) {
    console.log(`→ dry-run: ${staged.length} файлов, дерево ${tree}`);
    for (const file of staged) console.log(`  ${file.repoPath}`);
    process.exit(0);
  }

  const commit = git(["commit-tree", tree, "-m", message]);
  git(["update-ref", "refs/heads/gh-pages", commit]);
  console.log(`→ push origin gh-pages (${commit.slice(0, 7)})`);
  git(["push", "--force", "origin", "gh-pages"], { stdio: "inherit" });

  console.log(`✓ опубликовано: ${staged.length} файлов, https://ars-anosov.github.io/sipjs-react/`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
