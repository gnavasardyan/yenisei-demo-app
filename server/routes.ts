import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy all API requests to the external backend
  app.use("/api", (req, res) => {
    // Build target URL with query parameters
    const targetUrl = `https://qdr.equiron.com${req.originalUrl.replace(/^\/api/, '')}`;
    
    // Forward the request to the external API
    const headers: Record<string, string> = {};
    
    // Only copy safe headers, avoid cookies and hop-by-hop headers
    const safeHeaders = ['authorization', 'content-type', 'accept', 'user-agent'];
    safeHeaders.forEach(key => {
      const value = req.headers[key];
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
    
    // Don't force JSON Content-Type for GET/HEAD requests or if content-type is already set
    if (!req.headers['content-type'] && req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    
    // Handle multipart uploads specially
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('Proxying multipart request to:', targetUrl);
      
      // For multipart, we need to collect raw body and forward it
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        fetch(targetUrl, {
          method: req.method,
          headers,
          body: buffer,
        })
        .then(response => {
          res.status(response.status);
          if (response.headers.get('content-type')?.includes('application/json')) {
            return response.json().then(data => res.json(data));
          } else {
            return response.text().then(text => res.send(text));
          }
        })
        .catch(error => {
          console.error('Multipart proxy error:', error);
          res.status(500).json({ error: 'Multipart upload failed' });
        });
      });
      return; // Don't continue with regular fetch
    }
    
    // Prepare body for non-multipart requests
    let body: any;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const contentType = req.headers['content-type'];
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(req.body);
      } else {
        body = req.body;
      }
    }
    
    fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })
    .then(response => {
      res.status(response.status);
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json().then(data => res.json(data));
      } else {
        return response.text().then(text => res.send(text));
      }
    })
    .catch(error => {
      console.error('API proxy error:', error);
      res.status(500).json({ error: 'External API error' });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
