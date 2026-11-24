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

const makeEnum = (values) =>
  Object.freeze(Object.fromEntries(values.map((value) => [value, value])));

const createOfflinePackageShim = (request) => {
  if (request === 'dotenv') {
    const shim = { config: () => ({ parsed: {} }) };
    return { __esModule: true, ...shim, default: shim };
  }

  if (request === '@prisma/client') {
    class MockPrismaClient {
      $on() {}
      async $disconnect() {}
    }
    class Decimal {
      constructor(v) {
        this.val = Number(v);
      }
      toNumber() {
        return this.val;
      }
      toString() {
        return String(this.val);
      }
    }
    return {
      PrismaClient: MockPrismaClient,
      Prisma: {
        Decimal,
        sql: (strings, ...values) => ({
          strings: Array.from(strings),
          values,
        }),
        join: (items) => items,
      },
      UserRole: makeEnum(['STUDENT', 'TEACHER', 'ADMIN']),
      VerificationStatus: makeEnum(['PENDING', 'APPROVED', 'REJECTED']),
      CourseType: makeEnum(['LIVE', 'RECORDED', 'HYBRID']),
      LessonType: makeEnum(['LIVE', 'RECORDED', 'HYBRID']),
      PaymentStatus: makeEnum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
      OrderStatus: makeEnum(['PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'FAILED']),
      ReportStatus: makeEnum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
      ReportType: makeEnum([
        'QUALITY_ISSUE',
        'INAPPROPRIATE_CONTENT',
        'FRAUD',
        'TECHNICAL_ISSUE',
        'OTHER',
      ]),
      LiveSessionStatus: makeEnum([
        'SCHEDULED',
        'ONGOING',
        'COMPLETED',
        'CANCELLED',
      ]),
      RefundStatus: makeEnum([
        'PENDING',
        'APPROVED',
        'REJECTED',
        'COMPLETED',
        'PROCESSING',
      ]),
      RefundMethod: makeEnum(['ORIGINAL_PAYMENT', 'WALLET', 'BANK_TRANSFER']),
      SupportTicketStatus: makeEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
      SupportTicketPriority: makeEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      RegistrationStatus: makeEnum(['PENDING', 'APPROVED', 'REJECTED']),
      AdPlacement: makeEnum(['LOGIN_MODAL']),
      AdStatus: makeEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
      AdDestinationType: makeEnum(['INTERNAL', 'EXTERNAL']),
      AdTheme: makeEnum([
        'MIDNIGHT',
        'SUNSET',
        'AURORA',
        'OCEAN',
        'FOREST',
        'ROSE',
      ]),
      WalletTransactionType: makeEnum([
        'CREDIT',
        'DEBIT',
        'FREEZE',
        'UNFREEZE',
        'ADJUSTMENT',
      ]),
      WalletTransactionSource: makeEnum([
        'COURSE_SALE',
        'REFUND',
        'REVERSAL',
        'ADMIN_ADJUSTMENT',
        'PAYOUT',
      ]),
      PayoutMethodType: makeEnum([
        'BANK_TRANSFER',
        'GRABPAY',
        'TOUCH_N_GO',
        'PAYPAL',
        'OTHER',
      ]),
      PayoutRequestStatus: makeEnum([
        'PENDING',
        'APPROVED',
        'REJECTED',
        'PROCESSING',
        'PAID',
        'CANCELLED',
      ]),
      VerificationMethod: makeEnum(['MANUAL', 'AUTO']),
    };
  }

  if (request === 'multer') {
    const multerShim = Object.assign(
      () => ({
        single: () => (_req, _res, next) => next(),
        array: () => (_req, _res, next) => next(),
      }),
      { diskStorage: (opts) => opts }
    );
    return { __esModule: true, default: multerShim };
  }

  if (request === 'winston') {
    const noopLogger = {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
      add: () => undefined,
    };
    const winstonShim = {
      createLogger: () => noopLogger,
      format: Object.assign(
        (fn) => () => fn,
        {
          combine: () => ({}),
          timestamp: () => ({}),
          errors: () => ({}),
          splat: () => ({}),
          json: () => ({}),
          colorize: () => ({}),
          printf: () => ({}),
        }
      ),
      transports: { File: class {}, Console: class {} },
    };
    return { __esModule: true, ...winstonShim, default: winstonShim };
  }

  if (request === 'bcryptjs') {
    const bcryptShim = {
      hash: async (value) => `hashed:${value}`,
      compare: async () => true,
    };
    return { __esModule: true, ...bcryptShim, default: bcryptShim };
  }

  if (request === 'jsonwebtoken') {
    const jwtShim = {
      verify: () => ({}),
      sign: () => 'signed-token',
    };
    return { __esModule: true, ...jwtShim, default: jwtShim };
  }

  if (request === 'axios') {
    const axiosShim = {
      create: () => ({
        interceptors: {
          request: { use: () => undefined },
          response: { use: () => undefined },
        },
      }),
      post: async () => ({ data: {} }),
      isAxiosError: (val) =>
        Boolean(val && typeof val === 'object' && 'isAxiosError' in val),
    };
    return { __esModule: true, ...axiosShim, default: axiosShim };
  }

  if (request === 'react-hot-toast') {
    const toastShim = Object.assign(() => undefined, {
      error: () => undefined,
      success: () => undefined,
    });
    return { __esModule: true, default: toastShim };
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
      const shim = createOfflinePackageShim(request);
      if (shim) {
        return shim;
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
