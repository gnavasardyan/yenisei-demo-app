import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Special handling for auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log('Auth login request:', req.body);
      
      // Convert to form data
      const formData = new URLSearchParams({
        grant_type: 'password',
        username: req.body.username || '',
        password: req.body.password || '',
        scope: '',
        client_id: 'string',
        client_secret: ''
      });

      console.log('Sending to auth API:', formData.toString());

      const response = await fetch('https://qdr.equiron.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        const errorText = await response.text();
        console.log('Auth API error:', response.status, errorText);
        res.status(response.status).json({ error: 'Authentication failed' });
      }
    } catch (error) {
      console.error('Auth proxy error:', error);
      res.status(500).json({ error: 'Authentication service error' });
    }
  });

  // Special handling for adding text to task description
  app.post("/api/tasks/:id/add-to-description", async (req, res) => {
    try {
      const { additionalText, fullTask } = req.body;
      const taskId = req.params.id;
      
      console.log('Adding text to task description:', taskId, additionalText);
      
      // Prepare headers with authorization
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      // Forward authorization header if present
      if (req.headers.authorization) {
        headers['authorization'] = req.headers.authorization;
      }
      
      // Use provided full task data if available, otherwise fetch from API
      let task;
      if (fullTask) {
        task = fullTask;
        console.log('Using full task from client:', JSON.stringify(task, null, 2));
      } else {
        console.log('Fetching task from external API...');
        const getResponse = await fetch(`https://qdr.equiron.com/tasks/${taskId}`, {
          method: 'GET',
          headers,
        });

        if (!getResponse.ok) {
          return res.status(getResponse.status).json({ error: 'Failed to fetch task' });
        }

        const taskData = await getResponse.json();
        task = taskData.task || taskData;
        console.log('Original task data from API:', JSON.stringify(task, null, 2));
      }
      
      // Append the new text to existing description
      const currentDescription = task.description || '';
      const newDescription = currentDescription ? 
        `${currentDescription}\n\nДобавлено:\n${additionalText}` : 
        additionalText;
      
      // If we have full task data from client, preserve all fields
      const updateData = fullTask ? {
        ...task,
        description: newDescription
      } : {
        description: newDescription
      };
      
      console.log('Updating task data:', JSON.stringify(updateData, null, 2));
      
      const updateResponse = await fetch(`https://qdr.equiron.com/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (updateResponse.ok) {
        const data = await updateResponse.json();
        res.json(data);
      } else {
        const errorText = await updateResponse.text();
        console.log('Update task description API error:', updateResponse.status, errorText);
        res.status(updateResponse.status).json({ error: 'Failed to update task description' });
      }
    } catch (error) {
      console.error('Add to description proxy error:', error);
      res.status(500).json({ error: 'Add to description service error' });
    }
  });

  // Admin-only middleware for user management endpoints
  const requireAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    // For now, we'll trust the JWT token from the client side check
    // In production, you'd decode and verify the JWT token here
    // For this demo, we'll assume admin role based on token presence
    // Real implementation would decode JWT and check role
    next();
  };

  // Apply admin middleware to user management routes
  app.use("/api/users", requireAdmin);

  // Proxy all other API requests to the external backend
  app.use("/api", (req, res) => {
    // Build target URL with query parameters
    const targetUrl = `https://qdr.equiron.com${req.originalUrl.replace(/^\/api/, '')}`;
    
    // Debug logging
    console.log('Proxy request:', req.method, req.originalUrl, 'Content-Type:', req.headers['content-type']);
    
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

    // Ensure Authorization header is forwarded for all requests
    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization;
    }
    
    // Don't force JSON Content-Type for GET/HEAD requests or if content-type is already set
    if (!req.headers['content-type'] && req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    
    // Handle multipart uploads and form-encoded data specially
    if (req.method !== 'GET' && req.method !== 'HEAD' && 
        (req.headers['content-type']?.includes('multipart/form-data') || 
         req.headers['content-type']?.includes('application/x-www-form-urlencoded'))) {
      
      console.log('Proxying special request to:', targetUrl, 'Content-Type:', req.headers['content-type']);
      console.log('Request body type:', typeof req.body, 'body:', req.body);
      
      // Use existing parsed body for form-encoded data
      let body: string;
      try {
        if (req.body && typeof req.body === 'object') {
          console.log('Processing object body');
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(req.body)) {
            params.append(key, String(value));
          }
          body = params.toString();
        } else {
          console.log('Processing string body');
          body = String(req.body || '');
        }
        
        console.log('Sending form body:', body);
      } catch (error) {
        console.log('Body processing error:', error);
        body = '';
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
        console.error('Special proxy error:', error);
        res.status(500).json({ error: 'Special request failed' });
      });
      return; // Don't continue with regular fetch
    }
    
    // Prepare body for non-multipart requests
    let body: any;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const contentType = req.headers['content-type'];
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(req.body);
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        // Convert object to URL-encoded string
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(req.body)) {
          params.append(key, String(value));
        }
        body = params.toString();
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
