import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const frontendSrcDir = path.join(repoRoot, 'frontend', 'src');
const prismaSchemaPath = path.join(repoRoot, 'backend', 'prisma', 'schema.prisma');
const require = createRequire(import.meta.url);
const Module = require('node:module');

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/edutech_test';
process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-32-characters-long-12345';
process.env.JWT_REFRESH_SECRET ||=
  'test-jwt-refresh-secret-at-least-32-chars-67890';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.json'];

let cachedPrismaShim = null;
const buildPrismaClientShim = () => {
  if (cachedPrismaShim) {
    return cachedPrismaShim;
  }

  const enums = {};
  if (fs.existsSync(prismaSchemaPath)) {
    const schemaText = fs.readFileSync(prismaSchemaPath, 'utf8');
    const enumRegex = /enum\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}/g;
    let match;
    while ((match = enumRegex.exec(schemaText)) !== null) {
      const enumName = match[1];
      const members = match[2]
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, '').trim())
        .filter((line) => line && !line.startsWith('@'));
      enums[enumName] = Object.freeze(
        Object.fromEntries(members.map((member) => [member, member]))
      );
    }
  }

  class PrismaClientKnownRequestError extends Error {
    constructor(message, meta = {}) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = meta.code || 'P0000';
      this.clientVersion = meta.clientVersion || 'test';
    }
  }

  cachedPrismaShim = {
    __esModule: true,
    ...enums,
    Prisma: {
      JsonNull: Symbol.for('prisma.jsonNull'),
      DbNull: Symbol.for('prisma.dbNull'),
      AnyNull: Symbol.for('prisma.anyNull'),
      PrismaClientKnownRequestError,
    },
    PrismaClient: class PrismaClientShim {},
  };

  return cachedPrismaShim;
};

const buildMulterShim = () => {
  const multerFactory = (options = {}) => ({
    options,
    single: () => (_req, _res, next) => next?.(),
    array: () => (_req, _res, next) => next?.(),
    fields: () => (_req, _res, next) => next?.(),
    any: () => (_req, _res, next) => next?.(),
    none: () => (_req, _res, next) => next?.(),
  });
  multerFactory.diskStorage = (storageOpts) => storageOpts;
  multerFactory.memoryStorage = () => ({});
  multerFactory.MulterError = class MulterError extends Error {
    constructor(code, field) {
      super(code);
      this.code = code;
      this.field = field;
    }
  };
  return {
    __esModule: true,
    default: multerFactory,
    ...multerFactory,
  };
};

let cachedAxiosShim = null;
const buildAxiosShim = () => {
  if (cachedAxiosShim) {
    return cachedAxiosShim;
  }

  const createAxiosInstance = (defaults = {}) => {
    const requestHandlers = [];
    const responseHandlers = [];

    const dispatch = async (inputConfig) => {
      let config = {
        ...defaults,
        ...inputConfig,
        headers: {
          ...(defaults.headers || {}),
          ...(inputConfig?.headers || {}),
        },
      };

      for (const handler of requestHandlers) {
        if (handler?.fulfilled) {
          config = await handler.fulfilled(config);
        }
      }

      const adapter =
        config.adapter ||
        instance.defaults.adapter ||
        axiosObject.defaults.adapter;

      let promise = Promise.resolve().then(() => {
        if (typeof adapter !== 'function') {
          throw new Error('No mock axios adapter configured in offline test environment');
        }
        return adapter(config);
      });

      for (const handler of responseHandlers) {
        promise = promise.then(handler.fulfilled, handler.rejected);
      }

      return promise;
    };

    const instance = (config) => dispatch(config);
    instance.defaults = { ...defaults, headers: { ...(defaults.headers || {}) } };
    instance.interceptors = {
      request: {
        use: (fulfilled, rejected) => {
          requestHandlers.push({ fulfilled, rejected });
          return requestHandlers.length - 1;
        },
      },
      response: {
        use: (fulfilled, rejected) => {
          responseHandlers.push({ fulfilled, rejected });
          return responseHandlers.length - 1;
        },
      },
    };
    instance.get = (url, config = {}) => dispatch({ ...config, method: 'get', url });
    instance.delete = (url, config = {}) => dispatch({ ...config, method: 'delete', url });
    instance.post = (url, data, config = {}) =>
      dispatch({ ...config, method: 'post', url, data });
    instance.put = (url, data, config = {}) =>
      dispatch({ ...config, method: 'put', url, data });
    instance.patch = (url, data, config = {}) =>
      dispatch({ ...config, method: 'patch', url, data });

    return instance;
  };

  const axiosObject = createAxiosInstance();
  axiosObject.create = (defaults = {}) => createAxiosInstance(defaults);
  axiosObject.isAxiosError = (payload) => Boolean(payload && payload.isAxiosError === true);

  cachedAxiosShim = {
    __esModule: true,
    default: axiosObject,
    ...axiosObject,
  };
  return cachedAxiosShim;
};

const buildToastShim = () => {
  const toastFn = () => 'toast-id';
  toastFn.success = () => 'toast-id';
  toastFn.error = () => 'toast-id';
  toastFn.loading = () => 'toast-id';
  toastFn.dismiss = () => undefined;
  return {
    __esModule: true,
    default: toastFn,
    toast: toastFn,
  };
};

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
  try {
    return originalLoad.call(this, request, parent, isMain);
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      if (request === 'dotenv') {
        const shim = { config: () => ({ parsed: {} }) };
        return { __esModule: true, ...shim, default: shim };
      }
      if (request === '@prisma/client') {
        return buildPrismaClientShim();
      }
      if (request === 'multer') {
        return buildMulterShim();
      }
      if (request === 'axios') {
        return buildAxiosShim();
      }
      if (request === 'react-hot-toast') {
        return buildToastShim();
      }
    }
    throw error;
  }
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
