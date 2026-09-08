import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const DEFAULT_MAX_LINES = 500;
const MAX_LINES = Number(
  process.env.CODE_QUALITY_MAX_LINES ?? DEFAULT_MAX_LINES,
);
const ROOTS = ["client/src", "server/src"];
const INCLUDED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORED_DIRS = new Set(["node_modules", "dist", "build", "coverage"]);
const IGNORED_FILE_PATTERNS = [
  /\.d\.ts$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
];

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
      walk(absolutePath, files);
    } else if (
      entry.isFile() &&
      INCLUDED_EXTENSIONS.has(path.extname(entry.name)) &&
      !IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(absolutePath))
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

const oversizedFiles = ROOTS.flatMap((root) => walk(path.join(ROOT_DIR, root)))
  .map((filePath) => ({
    filePath,
    lines: fs.readFileSync(filePath, "utf8").split(/\r?\n/).length,
  }))
  .filter(({ lines }) => lines > MAX_LINES)
  .sort((left, right) => right.lines - left.lines);

if (oversizedFiles.length === 0) {
  console.log(`No source files above ${MAX_LINES} LOC.`);
  process.exit(0);
}

console.error(`Found source files above ${MAX_LINES} LOC:`);
for (const { filePath, lines } of oversizedFiles) {
  console.error(`${lines}  ${path.relative(ROOT_DIR, filePath)}`);
}
process.exit(1);
