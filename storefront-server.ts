import express, { type ErrorRequestHandler } from 'express';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkoutRouter, initializeCheckoutStorage } from './checkout/checkout-server.ts';
import { commissionRouter, initializeCommissionStorage } from './commission/commission-server.ts';

const projectRoot = process.cwd();
const app = express();

app.disable('x-powered-by');
app.use(commissionRouter);
app.use(checkoutRouter);

app.get('/', (_request, response) => response.sendFile(path.join(projectRoot, 'catalog.html')));
app.get(['/commission', '/commission/', '/commission.html', '/commission/commission.html', '/commission/index.html'], (_request, response) =>
  response.sendFile(path.join(projectRoot, 'commission', 'commission.html')));
app.get(['/checkout', '/checkout/', '/checkout.html', '/checkout/checkout.html', '/checkout/index.html'], (_request, response) =>
  response.sendFile(path.join(projectRoot, 'checkout', 'checkout.html')));
for (const publicFile of [
  'homepage.html', 'homepage~stylesheet.css', 'portfolio.html', 'login.html', 'login.css',
  'SearchResultsPage.html', 'terms-of-service.html', 'terms-of-service.css',
]) {
  app.get(`/${publicFile}`, (_request, response) => response.sendFile(path.join(projectRoot, publicFile)));
}
app.get('/AboutUsPage.html', (_request, response) =>
  response.sendFile(path.join(projectRoot, 'src', 'pages', 'AboutUsPage.html')));
app.get('/catalog.html', (_request, response) => response.sendFile(path.join(projectRoot, 'catalog.html')));
app.get('/Pages/ShoppingCart.html', (_request, response) =>
  response.sendFile(path.join(projectRoot, 'Pages', 'ShoppingCart.html')));
app.get('/commission/commission.css', (_request, response) =>
  response.sendFile(path.join(projectRoot, 'commission', 'commission.css')));
app.get('/checkout/checkout.css', (_request, response) =>
  response.sendFile(path.join(projectRoot, 'checkout', 'checkout.css')));
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

app.get('/commission/commission-client.js', serveTypeScriptClient('commission/commission-client.ts'));
app.get('/checkout/checkout-client.js', serveTypeScriptClient('checkout/checkout-client.ts'));
app.get('/storefront-cart.js', serveTypeScriptClient('storefront-cart.ts'));

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error('Storefront server error:', error);
  response.status(500).json({ message: 'The server could not process your request.' });
};
app.use(errorHandler);

async function startServer(): Promise<void> {
  await initializeCommissionStorage();
  await initializeCheckoutStorage();
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
