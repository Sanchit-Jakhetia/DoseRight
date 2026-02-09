import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { connectDB } from './models';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import hardwareRouter from './routes/hardware.routes';
import deviceRouter from './routes/device.routes';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use((req: Request, _res: Response, next) => {
  req.on('aborted', () => {
    console.warn('Request aborted', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      contentLength: req.headers['content-length'] || null,
      userAgent: req.headers['user-agent'] || null,
    });
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple hardware request/response dashboard
app.get('/debug/hardware', (_req: Request, res: Response) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DoseRight Hardware Debug</title>
    <style>
      :root {
        --bg: #0f141a;
        --panel: #141b23;
        --text: #e6edf3;
        --muted: #9aa7b2;
        --accent: #7bd389;
        --danger: #f07b7b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        background: radial-gradient(1200px 600px at 10% 10%, #1b2430 0%, var(--bg) 55%);
        color: var(--text);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      h1 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 0.4px;
      }
      .tag {
        font-size: 12px;
        color: var(--muted);
      }
      .panel {
        background: var(--panel);
        border: 1px solid #1e2a38;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      label {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      input {
        width: 100%;
        padding: 10px 12px;
        background: #0c1117;
        color: var(--text);
        border: 1px solid #233143;
        border-radius: 8px;
      }
      button {
        background: var(--accent);
        color: #0b131a;
        font-weight: 600;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
      }
      button:active { transform: translateY(1px); }
      .meta {
        font-size: 12px;
        color: var(--muted);
      }
      .logs {
        display: grid;
        gap: 12px;
      }
      .log {
        border: 1px solid #223243;
        border-radius: 10px;
        padding: 12px;
        background: #0b1117;
      }
      .log header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .status-ok { color: var(--accent); }
      .status-bad { color: var(--danger); }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: #0f151c;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #1d2a3a;
        font-size: 12px;
        color: #c9d4dd;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>DoseRight Hardware Debug</h1>
        <div class="tag">Requests sent and responses received</div>
      </div>
      <div class="actions">
        <button id="runBtn" type="button">Run Requests</button>
        <div class="meta" id="lastRun">Last run: never</div>
      </div>
    </header>

    <section class="panel">
      <div class="grid">
        <div>
          <label for="baseUrl">Backend base URL</label>
          <input id="baseUrl" value="http://10.192.209.120:8080" />
        </div>
        <div>
          <label for="deviceId">Device ID</label>
          <input id="deviceId" value="DR-ESP32-001" />
        </div>
        <div>
          <label for="doseId">Dose ID (for mark endpoints)</label>
          <input id="doseId" placeholder="paste a DoseLog _id" />
        </div>
        <div>
          <label for="deviceSecret">Device secret</label>
          <input id="deviceSecret" value="supersecret_shared_key" />
        </div>
      </div>
      <div class="meta" style="margin-top: 10px;">This page refreshes data when you reload or click "Run Requests".</div>
    </section>

    <section class="panel">
      <div class="logs" id="logs"></div>
    </section>

    <script>
      const logsEl = document.getElementById('logs');
      const runBtn = document.getElementById('runBtn');
      const lastRun = document.getElementById('lastRun');

      function getConfig() {
        return {
          baseUrl: document.getElementById('baseUrl').value.trim(),
          deviceId: document.getElementById('deviceId').value.trim(),
          doseId: document.getElementById('doseId').value.trim(),
          deviceSecret: document.getElementById('deviceSecret').value.trim(),
        };
      }

      function renderLog(entry) {
        const log = document.createElement('div');
        log.className = 'log';
        const statusClass = entry.ok ? 'status-ok' : 'status-bad';
        log.innerHTML =
          '<header>' +
            '<div><strong>' + entry.name + '</strong> ' + entry.method + ' ' + entry.url + '</div>' +
            '<div class="' + statusClass + '">' + entry.status + '</div>' +
          '</header>' +
          '<div class="meta">Request</div>' +
          '<pre>' + entry.request + '</pre>' +
          '<div class="meta" style="margin-top: 8px;">Response</div>' +
          '<pre>' + entry.response + '</pre>';
        logsEl.appendChild(log);
      }

      async function callEndpoint(def, config) {
        const url = def.method === 'GET'
          ? config.baseUrl + def.path + '?deviceId=' + encodeURIComponent(config.deviceId)
          : config.baseUrl + def.path;

        const headers = {
          'Authorization': 'Bearer ' + config.deviceSecret,
          'Content-Type': 'application/json',
        };

        const options = { method: def.method, headers };
        if (def.method !== 'GET') {
          options.body = JSON.stringify(def.body);
        }

        const requestSummary = JSON.stringify({
          method: def.method,
          url: url,
          headers: headers,
          body: def.method === 'GET' ? null : def.body,
        }, null, 2);

        try {
          const response = await fetch(url, options);
          const text = await response.text();
          let parsed;
          try { parsed = JSON.parse(text); } catch { parsed = text; }

          renderLog({
            name: def.name,
            method: def.method,
            url: url,
            status: response.status + ' ' + response.statusText,
            ok: response.ok,
            request: requestSummary,
            response: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2),
          });
        } catch (error) {
          renderLog({
            name: def.name,
            method: def.method,
            url: url,
            status: 'NETWORK ERROR',
            ok: false,
            request: requestSummary,
            response: String(error),
          });
        }
      }

      async function runAll() {
        logsEl.innerHTML = '';
        const config = getConfig();
        const endpoints = [
          { name: 'Time', method: 'GET', path: '/api/hardware/time' },
          { name: 'Profile', method: 'GET', path: '/api/hardware/profile' },
          { name: 'Upcoming', method: 'GET', path: '/api/hardware/upcoming' },
          { name: 'Taken', method: 'GET', path: '/api/hardware/taken' },
          { name: 'Missed', method: 'GET', path: '/api/hardware/missed' },
          {
            name: 'Heartbeat',
            method: 'POST',
            path: '/api/hardware/heartbeat',
            body: {
              deviceId: config.deviceId,
              batteryLevel: 87,
              wifiStrength: -50,
            },
          },
        ];

        if (config.doseId) {
          endpoints.push({
            name: 'Mark Taken',
            method: 'PATCH',
            path: '/api/hardware/doses/' + encodeURIComponent(config.doseId) + '/mark-taken',
            body: { deviceId: config.deviceId },
          });
          endpoints.push({
            name: 'Mark Skipped',
            method: 'PATCH',
            path: '/api/hardware/doses/' + encodeURIComponent(config.doseId) + '/mark-skipped',
            body: { deviceId: config.deviceId },
          });
        }

        for (const endpoint of endpoints) {
          await callEndpoint(endpoint, config);
        }

        lastRun.textContent = 'Last run: ' + new Date().toLocaleTimeString();
      }

      runBtn.addEventListener('click', runAll);
      window.addEventListener('load', runAll);
    </script>
  </body>
</html>`);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hardware', hardwareRouter);
app.use('/api/device', deviceRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const host = '0.0.0.0';
    app.listen(config.port, host, () => {
      console.log(`\n🚀 Server running on http://${host}:${config.port} in ${config.nodeEnv} mode`);
      console.log(`✓ CORS enabled for: ${config.corsOrigin}`);
      console.log(`✓ API Base URL: http://${host === '0.0.0.0' ? 'localhost' : host}:${config.port}/api\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
