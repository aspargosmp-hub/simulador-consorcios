import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runPythonSync(
  scriptPath: string,
  seedPath: string,
  callback?: (err: Error | null, result?: any) => void
) {
  execFile('python3', [scriptPath], { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      callback?.(new Error(stderr || err.message));
      return;
    }
    try {
      const summary = JSON.parse(stdout.trim());
      const updatedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      callback?.(null, { ...summary, data: updatedData });
    } catch (parseErr: any) {
      callback?.(parseErr);
    }
  });
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'bb-sync-api',
      configureServer(server) {
        const scriptPath = path.resolve(__dirname, 'scripts/sync_bb.py');
        const assembleiaScriptPath = path.resolve(__dirname, 'scripts/query_assembleia.py');
        const seedPath = path.resolve(__dirname, 'src/data/consorciosSeed.json');

        // Agendador automático: roda 1x por dia (a cada 24h) enquanto o servidor estiver ligado
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        setInterval(() => {
          runPythonSync(scriptPath, seedPath);
        }, ONE_DAY_MS);

        server.middlewares.use('/api/sync', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }
          runPythonSync(scriptPath, seedPath, (err, payload) => {
            res.setHeader('Content-Type', 'application/json');
            if (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: err.message }));
              return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify(payload));
          });
        });

        server.middlewares.use('/api/assembleia', (req, res) => {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const grupo = urlObj.searchParams.get('grupo') || '001583';
          const dtIni = urlObj.searchParams.get('dtIni') || '01/11/2025';
          const dtFim = urlObj.searchParams.get('dtFim') || '29/10/2026';

          execFile(
            'python3',
            [assembleiaScriptPath, grupo, dtIni, dtFim],
            { timeout: 30000 },
            (err, stdout, stderr) => {
              res.setHeader('Content-Type', 'application/json');
              if (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: stderr || err.message }));
                return;
              }
              res.statusCode = 200;
              res.end(stdout.trim());
            }
          );
        });
      },
    },
  ],
});
