import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';

// Shim for global process/Buffer if needed, though nodejs_compat handles most
import { Buffer } from 'node:buffer';
globalThis.Buffer = Buffer;

const expressApp = express();
let nestApp: any;

async function bootstrap() {
  if (nestApp) return nestApp;
  
  nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.enableCors();
  await nestApp.init();
  return nestApp;
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    await bootstrap();

    return new Promise(async (resolve) => {
      const url = new URL(request.url);
      
      // Create a mock of IncomingMessage
      const req: any = new (await import('node:http')).IncomingMessage(null as any);
      req.url = url.pathname + url.search;
      req.method = request.method;
      req.headers = Object.fromEntries(request.headers);
      req.body = request.body; // Stream? nodejs_compat handles streams differently. 
      // For JSON/Text bodies, we might need to buffer.
      
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
         // Simple body handling for now
         const bodyBuffer = await request.arrayBuffer();
         req.push(Buffer.from(bodyBuffer));
         req.push(null);
      } else {
        req.push(null);
      }

      // Create a mock of ServerResponse
      const res: any = new (await import('node:http')).ServerResponse(req);
      
      let responseBody: any = Buffer.alloc(0);
      
      res.write = (chunk: any) => {
        responseBody = Buffer.concat([responseBody, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
        return true;
      };
      
      res.end = (chunk: any) => {
        if (chunk) {
          responseBody = Buffer.concat([responseBody, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
        }
        
        const responseHeaders: Record<string, string> = {};
        if (res.getHeaders) {
             const headers = res.getHeaders();
             for (const key in headers) {
                 responseHeaders[key] = String(headers[key]);
             }
        }
        
        resolve(new Response(responseBody, {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: responseHeaders,
        }));
      };

      // Dispatch to Express
      expressApp(req, res);
    });
  },
};
