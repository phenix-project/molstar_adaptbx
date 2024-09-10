const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const app = express();

// Get the port from the command line argument (default to 3000 if not provided)
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 3000;
console.log("Port:",port)
app.use(cors());
app.use(express.json({ limit: '100mb' }));

const clients = [];  // SSE clients
const wsClients = new Map();  // WebSocket clients

// Serve static files from 'molstar/build/phenix-viewer'
const staticPath = path.join(__dirname, '../../build/phenix-viewer');
app.use(express.static(staticPath));

// Add a route for serving the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));  // Make sure index.html exists in the static folder
});

// SSE Endpoint for sending data to connected clients
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);
  console.log('New client connected. Total clients:', clients.length);

  req.on('close', () => {
    clients.splice(clients.indexOf(res), 1);
    console.log('Client disconnected. Total clients:', clients.length);
  });
});

function handlePostRequest(req, res) {
  const payload = req.body;  // Receive the JSON payload (action and args)

  // Broadcast the payload to all connected SSE clients
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  // Track responses from WebSocket clients
  const responses = [];
  const totalClients = wsClients.size;
  let completedClients = 0;

  // Set a timeout to ensure we don't wait indefinitely for responses
  const timeoutDuration = 5000;  // Timeout after 5 seconds
  const timeout = setTimeout(() => {
    // Respond to the HTTP client after the timeout, including partial results
    res.json({
      success: false,
      message: 'Timeout waiting for some clients to respond',
      responses: responses,  // Return the partial responses we got
      failedClients: totalClients - completedClients  // Report number of clients that didn't respond
    });
  }, timeoutDuration);

  // Broadcast the payload to all WebSocket clients and wait for their responses
  wsClients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));

      // Listen for a response from the WebSocket client
      ws.once('message', (message) => {
        const data = JSON.parse(message);
        responses.push({ clientId, data });
        completedClients++;

        // Check if all clients have responded before the timeout
        if (completedClients === totalClients) {
          clearTimeout(timeout);  // Clear the timeout if all clients responded
          res.json({
            success: true,
            message: 'All clients responded',
            responses: responses
          });
        }
      });
    } else {
      // Handle the case where the WebSocket connection is not open
      responses.push({ clientId, error: 'WebSocket not open' });
      completedClients++;

      // If all clients have responded (or failed), return the response early
      if (completedClients === totalClients) {
        clearTimeout(timeout);  // Clear the timeout if all clients responded
        res.json({
          success: true,
          message: 'Some clients failed to respond, but continuing',
          responses: responses
        });
      }
    }
  });
}
app.post('/run', handlePostRequest);

// WebSocket Server for receiving responses from clients
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Assign a unique identifier to the client (you could use something more robust in real scenarios)
  const clientId = Date.now();
  wsClients.set(clientId, ws);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    //console.log('Received data from client:', data);
    ws.emit('response', data);  // Emit response event to resolve request
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log('WebSocket client disconnected');
  });
});