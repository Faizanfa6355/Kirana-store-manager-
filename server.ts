import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { handleRegister, handleLogin, handleForgotPassword, handleChangePassword, handleGetMe, authenticateToken } from './server/auth.js';
import storeRouter from './server/api.js';

// Clean any quoted environment variables injected into the container
for (const [key, value] of Object.entries(process.env)) {
  if (value && typeof value === 'string' && (key.startsWith('VITE_') || key.startsWith('FIREBASE_'))) {
    let cleaned = value.trim();
    while (
      (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    process.env[key] = cleaned;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body and cookie parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.post('/api/auth/register', handleRegister);
  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/forgot-password', handleForgotPassword);
  app.post('/api/auth/change-password', authenticateToken as any, handleChangePassword as any);
  app.get('/api/auth/me', authenticateToken, handleGetMe);

  // Store Routes
  app.use('/api/store', storeRouter);

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kirana Store Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
