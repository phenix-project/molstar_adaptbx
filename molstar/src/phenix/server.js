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

// Handle POST request and forward the data to all connected clients via SSE (no response required)
function handlePostRequest(req, res) {
  const payload = req.body;  // Receive the JSON payload (action and args)

  // Broadcast the payload to all connected clients
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  // Respond to the client that sent the POST request
  res.json({ success: true, message: 'Request forwarded to all clients' });
}

app.post('/action', handlePostRequest);

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
    console.log('Received data from client:', data);
    ws.emit('response', data);  // Emit response event to resolve request
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log('WebSocket client disconnected');
  });
});