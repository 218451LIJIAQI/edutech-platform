import { Request, Response, NextFunction } from 'express';

/**
 * API Version Management Middleware
 * Handles API versioning, deprecation warnings, and sunset headers
 */

export interface ApiVersionConfig {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  deprecationDate?: string; // ISO date string
  sunsetDate?: string;      // ISO date string when version will be removed
  message?: string;
}

// API version registry
const apiVersions: Record<string, ApiVersionConfig> = {
  v1: {
    version: 'v1',
    status: 'active',
    // Example: uncomment when ready to deprecate
    // status: 'deprecated',
    // deprecationDate: '2024-06-01',
    // sunsetDate: '2025-01-01',
    // message: 'API v1 is deprecated. Please migrate to v2 by January 2025.',
  },
  // Future versions
  // v2: {
  //   version: 'v2',
  //   status: 'active',
  // },
};

/**
 * Extract API version from request URL
 */
const extractVersion = (req: Request): string | null => {
  const match = req.path.match(/^\/api\/(v\d+)/);
  return match ? match[1] : null;
};

/**
 * Middleware to handle API versioning
 */
export const apiVersionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const version = extractVersion(req);
  
  if (!version) {
    return next();
  }

  const versionConfig = apiVersions[version];
  
  if (!versionConfig) {
    return res.status(400).json({
      success: false,
      message: `API version '${version}' is not supported`,
      supportedVersions: Object.keys(apiVersions).filter(
        (v) => apiVersions[v].status !== 'sunset'
      ),
    });
  }

  // Set API version header
  res.setHeader('X-API-Version', version);

  // Handle deprecated versions
  if (versionConfig.status === 'deprecated') {
    res.setHeader('Deprecation', versionConfig.deprecationDate || 'true');
    
    if (versionConfig.sunsetDate) {
      res.setHeader('Sunset', new Date(versionConfig.sunsetDate).toUTCString());
    }
    
    // Add warning header
    res.setHeader(
      'Warning',
      `299 - "This API version is deprecated${versionConfig.message ? `: ${versionConfig.message}` : ''}"`
    );

    // Also include deprecation info in response for programmatic access
    res.locals.apiDeprecation = {
      deprecated: true,
      deprecationDate: versionConfig.deprecationDate,
      sunsetDate: versionConfig.sunsetDate,
      message: versionConfig.message,
    };
  }

  // Handle sunset (removed) versions
  if (versionConfig.status === 'sunset') {
    return res.status(410).json({
      success: false,
      message: `API version '${version}' has been removed`,
      sunsetDate: versionConfig.sunsetDate,
      supportedVersions: Object.keys(apiVersions).filter(
        (v) => apiVersions[v].status === 'active'
      ),
    });
  }

  next();
};

/**
 * Decorator for route deprecation
 * Use on specific endpoints that are being deprecated within a version
 */
export const deprecateEndpoint = (options: {
  message?: string;
  sunsetDate?: string;
  alternative?: string;
}) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    
    if (options.sunsetDate) {
      res.setHeader('Sunset', new Date(options.sunsetDate).toUTCString());
    }

    const warning = [
      '299 - "This endpoint is deprecated',
      options.message && `: ${options.message}`,
      options.alternative && `. Use ${options.alternative} instead`,
      '"',
    ]
      .filter(Boolean)
      .join('');
    
    res.setHeader('Warning', warning);
    
    next();
  };
};

/**
 * Get current API version info
 */
export const getVersionInfo = (_req: Request, res: Response) => {
  const currentVersion = 'v1'; // Default to v1
  const versionConfig = apiVersions[currentVersion];

  res.json({
    success: true,
    currentVersion,
    status: versionConfig?.status || 'unknown',
    allVersions: Object.entries(apiVersions).map(([version, config]) => ({
      version,
      status: config.status,
      deprecationDate: config.deprecationDate,
      sunsetDate: config.sunsetDate,
    })),
  });
};

/**
 * Update API version status programmatically
 */
export const updateVersionStatus = (
  version: string,
  config: Partial<ApiVersionConfig>
) => {
  if (apiVersions[version]) {
    apiVersions[version] = { ...apiVersions[version], ...config };
  }
};

export default apiVersionMiddleware;
