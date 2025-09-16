import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy all API requests to the external backend
  app.use("/api", (req, res) => {
    const targetUrl = `https://qdr.equiron.com${req.path}`;
    
    // Forward the request to the external API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Copy relevant headers from the original request
    Object.keys(req.headers).forEach(key => {
      const value = req.headers[key];
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
    
    fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
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
