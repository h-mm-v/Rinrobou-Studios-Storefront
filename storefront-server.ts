import express, { type ErrorRequestHandler } from 'express';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkoutRouter } from './checkout-server.ts';
import { commissionRouter, initializeCommissionStorage } from './commission-server.ts';

const projectRoot = process.cwd();
const app = express();

app.disable('x-powered-by');
app.use(commissionRouter);
app.use(checkoutRouter);

app.get('/', (_request, response) => response.sendFile(path.join(projectRoot, 'commission.html')));
app.get('/commission.html', (_request, response) => response.sendFile(path.join(projectRoot, 'commission.html')));
app.get('/checkout.html', (_request, response) => response.sendFile(path.join(projectRoot, 'checkout.html')));
app.get('/catalog.html', (_request, response) => response.sendFile(path.join(projectRoot, 'catalog.html')));
app.get('/commission.css', (_request, response) => response.sendFile(path.join(projectRoot, 'commission.css')));
app.get('/checkout.css', (_request, response) => response.sendFile(path.join(projectRoot, 'checkout.css')));
app.get('/style.css', (_request, response) => response.sendFile(path.join(projectRoot, 'style.css')));
app.use(
  '/src/assets',
  express.static(path.join(projectRoot, 'src', 'assets'), { dotfiles: 'deny', index: false }),
);

function serveTypeScriptClient(sourceFile: string) {
  return async (_request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const source = await readFile(path.join(projectRoot, sourceFile), 'utf8');
      const javascript = ts.transpile(source, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      });
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8').send(javascript);
    } catch (error) {
      next(error);
    }
  };
}

app.get('/commission-client.js', serveTypeScriptClient('commission-client.ts'));
app.get('/checkout-client.js', serveTypeScriptClient('checkout-client.ts'));

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error('Storefront server error:', error);
  response.status(500).json({ message: 'The server could not process your request.' });
};
app.use(errorHandler);

async function startServer(): Promise<void> {
  await initializeCommissionStorage();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  app.listen(port, () => {
    console.log(`Storefront server listening on port ${port}.`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start storefront server:', error);
  process.exitCode = 1;
});
