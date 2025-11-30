import swaggerJsdoc from 'swagger-jsdoc';
import config from './env';

/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation from JSDoc comments
 */

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'Edutech Platform API',
    version: '1.0.0',
    description: `
# Edutech Platform API Documentation

A comprehensive learning management system API supporting:
- User authentication and authorization (Students, Teachers, Admins)
- Course management with live, recorded, and hybrid class types
- Payment processing via Stripe
- Real-time messaging with Socket.io
- Teacher wallet and earnings management
- Community features

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Rate Limiting
API requests are rate limited. See response headers for current limits:
- \`RateLimit-Limit\`: Maximum requests allowed
- \`RateLimit-Remaining\`: Remaining requests in window
- \`RateLimit-Reset\`: Time when limit resets
    `,
    contact: {
      name: 'Edutech Support',
      email: 'support@edutech.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}/api/${config.API_VERSION}`,
      description: 'Development server',
    },
    {
      url: `/api/${config.API_VERSION}`,
      description: 'Production server (relative)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          message: {
            type: 'string',
            example: 'Error message description',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success',
          },
          message: {
            type: 'string',
          },
          data: {
            type: 'object',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'] },
          avatar: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 8 },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          courseType: { type: 'string', enum: ['LIVE', 'RECORDED', 'HYBRID'] },
          thumbnail: { type: 'string', nullable: true },
          isPublished: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required or token invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { status: 'error', message: 'Authentication required' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { status: 'error', message: 'Access denied' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { status: 'error', message: 'Resource not found' },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { status: 'error', message: 'Validation failed' },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { status: 'error', message: 'Too many requests' },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Courses', description: 'Course operations' },
    { name: 'Enrollments', description: 'Course enrollments' },
    { name: 'Payments', description: 'Payment processing' },
    { name: 'Reviews', description: 'Course reviews' },
    { name: 'Community', description: 'Community features' },
    { name: 'Messages', description: 'Messaging system' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Support', description: 'Support tickets' },
    { name: 'Teacher', description: 'Teacher-specific operations' },
    { name: 'Admin', description: 'Admin operations' },
    { name: 'Wallet', description: 'Wallet and earnings' },
    { name: 'Health', description: 'Health check endpoints' },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Path to the API docs in route files
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
