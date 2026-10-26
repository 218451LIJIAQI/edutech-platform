// Export the HTTP server so the API and Socket.IO share the same function.
module.exports = require('../backend/dist/index').httpServer;
