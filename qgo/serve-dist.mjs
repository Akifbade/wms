#!/usr/bin/env node
/**
 * Simple HTTP server to serve the React app dist folder
 * Runs on port 3000 and serves the built React application
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const server = http.createServer((req, res) => {
  // Parse the requested URL
  let pathname = new url.URL(req.url, `http://${req.headers.host}`).pathname;
  
  // Remove leading slash
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Construct file path
  let filePath = path.join(DIST_DIR, pathname);
  
  // Prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // File doesn't exist - serve index.html for SPA routing
      filePath = path.join(DIST_DIR, 'index.html');
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(content);
      });
    } else if (stats.isDirectory()) {
      // Directory - serve index.html
      filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(content);
      });
    } else {
      // File exists - serve it
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      
      // Determine content type
      if (ext === '.html') contentType = 'text/html; charset=utf-8';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.woff') contentType = 'font/woff';
      else if (ext === '.woff2') contentType = 'font/woff2';
      else if (ext === '.ttf') contentType = 'font/ttf';
      else if (ext === '.eot') contentType = 'application/vnd.ms-fontobject';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }
        
        // Set cache headers based on file type
        let cacheControl = 'public, max-age=3600'; // 1 hour default
        if (ext === '.html') {
          cacheControl = 'public, max-age=0'; // Don't cache HTML
        } else if (['.js', '.css'].includes(ext)) {
          cacheControl = 'public, max-age=31536000'; // 1 year for versioned files
        }
        
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ QGO Frontend server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${DIST_DIR}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
