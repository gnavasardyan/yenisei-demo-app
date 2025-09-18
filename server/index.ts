import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Handle multipart/form-data uploads BEFORE Express body parsing middleware
app.use("/api", (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && 
      req.headers['content-type']?.includes('multipart/form-data')) {
    
    // Build target URL
    const targetUrl = `https://qdr.equiron.com${req.originalUrl.replace(/^\/api/, '')}`;
    
    console.log('Proxying multipart upload to:', targetUrl, 'Content-Type:', req.headers['content-type']);
    
    // Log authorization header for debugging
    if (req.headers.authorization) {
      console.log('Multipart request has authorization header (length:', req.headers.authorization.length, ')');
    } else {
      console.error('CRITICAL: Multipart request missing authorization header - this will cause 401 error');
    }
    
    // Forward headers
    const headers: Record<string, string> = {};
    const safeHeaders = ['authorization', 'content-type', 'accept', 'user-agent'];
    safeHeaders.forEach(key => {
      const value = req.headers[key];
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
    
    // Remove content-length to let fetch handle it properly
    if (headers['content-length']) {
      delete headers['content-length'];
    }
    
    // Stream the raw request body to the target URL
    fetch(targetUrl, {
      method: req.method,
      headers,
      body: req as any, // Stream the request directly
      duplex: 'half' as any,
    })
    .then(response => {
      console.log('Multipart upload response status:', response.status);
      if (response.status >= 400) {
        console.error('Multipart upload failed with status:', response.status);
        response.text().then(text => console.error('Error response body:', text));
      }
      
      res.status(response.status);
      // Copy response headers
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json().then(data => {
          console.log('Multipart upload success response:', data);
          res.json(data);
        });
      } else {
        return response.text().then(text => {
          console.log('Multipart upload text response:', text.substring(0, 100));
          res.send(text);
        });
      }
    })
    .catch(error => {
      console.error('Multipart proxy error:', error);
      res.status(500).json({ error: 'File upload failed' });
    });
    return; // Don't continue to next middleware
  }
  
  next(); // Continue to body parsing middleware for non-multipart requests
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
