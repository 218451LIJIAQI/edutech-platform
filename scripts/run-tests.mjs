import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const frontendSrcDir = path.join(repoRoot, 'frontend', 'src');
const require = createRequire(import.meta.url);
const Module = require('node:module');

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/edutech_test';
process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-32-characters-long-12345';
process.env.JWT_REFRESH_SECRET ||=
  'test-jwt-refresh-secret-at-least-32-chars-67890';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.json'];

const tryLoadCompiler = () => {
  const tsCandidates = [
    path.join(repoRoot, 'backend', 'node_modules', 'typescript'),
    path.join(repoRoot, 'frontend', 'node_modules', 'typescript'),
    'typescript',
  ];

  for (const candidate of tsCandidates) {
    try {
      const ts = require(candidate);
      return (code, filename) =>
        ts.transpileModule(code, {
          fileName: filename,
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
            resolveJsonModule: true,
          },
        }).outputText;
    } catch {
      // Try next candidate.
    }
  }

  const babelDirs = [
    path.join(repoRoot, 'frontend', 'node_modules'),
    path.join(repoRoot, 'backend', 'node_modules'),
    '/usr/share/nodejs',
  ];

  for (const baseDir of babelDirs) {
    try {
      const babel = require(path.join(baseDir, '@babel', 'core'));
      const presetTypescript = require(
        path.join(baseDir, '@babel', 'preset-typescript')
      );
      const presetReact = require(path.join(baseDir, '@babel', 'preset-react'));
      const pluginCommonJs = require(
        path.join(baseDir, '@babel', 'plugin-transform-modules-commonjs')
      );

      return (code, filename) => {
        const result = babel.transformSync(code, {
          filename,
          babelrc: false,
          configFile: false,
          presets: [
            [
              presetTypescript,
              { isTSX: filename.endsWith('.tsx'), allExtensions: true },
            ],
            [presetReact, { runtime: 'automatic' }],
          ],
          plugins: [[pluginCommonJs, { loose: false }]],
        });
        return result?.code ?? '';
      };
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    'Unable to locate a TypeScript compiler (`typescript` or `@babel/core`).'
  );
};

const transpileTypeScript = tryLoadCompiler();

const probeCandidateFile = (basePath) => {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = `${basePath}${ext}`;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }

  return null;
};

const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function resolveWithTypeScriptSupport(
  request,
  parent,
  isMain,
  options
) {
  if (request.startsWith('@/')) {
    const resolvedAlias = probeCandidateFile(
      path.join(frontendSrcDir, request.slice(2))
    );
    if (resolvedAlias) {
      return resolvedAlias;
    }
  }

  if (
    (request.startsWith('./') ||
      request.startsWith('../') ||
      path.isAbsolute(request)) &&
    parent?.filename
  ) {
    const candidateBase = path.isAbsolute(request)
      ? request
      : path.resolve(path.dirname(parent.filename), request);
    const resolvedRelative = probeCandidateFile(candidateBase);
    if (resolvedRelative) {
      return resolvedRelative;
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function loadWithFallbacks(request, parent, isMain) {
  if (request === 'dotenv') {
    try {
      return originalLoad.call(this, request, parent, isMain);
    } catch (error) {
      if (error?.code === 'MODULE_NOT_FOUND') {
        const shim = { config: () => ({ parsed: {} }) };
        return { __esModule: true, ...shim, default: shim };
      }
      throw error;
    }
  }
  return originalLoad.call(this, request, parent, isMain);
};

const compileSourceModule = (module, filename) => {
  const rawSource = fs.readFileSync(filename, 'utf8');
  const rewrittenSource = rawSource.replace(
    /\bimport\.meta\.env\b/g,
    '(globalThis.__TEST_IMPORT_META_ENV__ || {})'
  );
  const compiled = transpileTypeScript(rewrittenSource, filename);
  module._compile(compiled, filename);
};

Module._extensions['.ts'] = compileSourceModule;
Module._extensions['.tsx'] = compileSourceModule;

const collectTestFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
};

const target = (process.argv[2] || 'all').toLowerCase();
const searchRoots =
  target === 'backend'
    ? [path.join(repoRoot, 'backend', 'src', '__tests__')]
    : target === 'frontend'
      ? [path.join(repoRoot, 'frontend', 'src', '__tests__')]
      : [
          path.join(repoRoot, 'backend', 'src', '__tests__'),
          path.join(repoRoot, 'frontend', 'src', '__tests__'),
        ];

const discoveredTests = searchRoots.flatMap(collectTestFiles);

if (discoveredTests.length === 0) {
  console.error(`No test files found for target "${target}".`);
  process.exit(1);
}

for (const testFile of discoveredTests) {
  require(testFile);
}
