import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Proxy Route for Webhooks to avoid browser CORS constraints
  app.post('/api/webhook-proxy', async (req, res) => {
    try {
      const { targetUrl, payload } = req.body;

      if (!targetUrl) {
        return res.status(400).json({ status: 'error', message: 'targetUrl é obrigatório' });
      }

      console.log(`[Webhook Proxy] Disparando solicitação para: ${targetUrl}`);

      const webhookResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await webhookResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log(`[Webhook Proxy] Resposta recebida da URL (Status ${webhookResponse.status}):`, responseData);

      if (!webhookResponse.ok) {
        return res.status(webhookResponse.status).json({
          status: 'error',
          message: `Webhook respondeu com HTTP ${webhookResponse.status}`,
          data: responseData
        });
      }

      return res.status(200).json(responseData);
    } catch (error: any) {
      console.error('[Webhook Proxy Error]:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Erro ao conectar ao webhook via servidor'
      });
    }
  });

  // API Proxy Route for Supabase Storage Upload to bypass CORS/browser restrictions
  app.post('/api/supabase-upload', async (req, res) => {
    try {
      const { bucket, path: storagePath, fileBase64, contentType, supabaseUrl, supabaseKey } = req.body;

      const url = process.env.VITE_SUPABASE_URL || supabaseUrl;
      const key = process.env.VITE_SUPABASE_KEY || supabaseKey;

      if (!url || !key) {
        return res.status(400).json({ status: 'error', message: 'Credenciais do Supabase não configuradas no servidor' });
      }

      if (!fileBase64) {
        return res.status(400).json({ status: 'error', message: 'Conteúdo do arquivo não recebido' });
      }

      const fileBuffer = Buffer.from(fileBase64, 'base64');
      const cleanUrl = url.replace(/\/$/, '');

      console.log(`[Supabase Upload Proxy] Enviando ${fileBuffer.length} bytes para ${cleanUrl}/storage/v1/object/${bucket}/${storagePath}`);

      // 1. Upload file object to Supabase Storage
      const uploadRes = await fetch(`${cleanUrl}/storage/v1/object/${bucket}/${storagePath}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'apikey': key,
          'Content-Type': contentType || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: fileBuffer
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('[Supabase Upload Proxy Error]:', uploadRes.status, errText);
        return res.status(uploadRes.status).json({
          status: 'error',
          message: `Erro no upload Supabase (${uploadRes.status}): ${errText}`
        });
      }

      // 2. Generate signed URL (604800s = 7 days)
      let signedUrl = '';
      try {
        const signRes = await fetch(`${cleanUrl}/storage/v1/object/sign/${bucket}/${storagePath}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'apikey': key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ expiresIn: 604800 })
        });

        if (signRes.ok) {
          const signData = await signRes.json();
          const rawPath = signData?.signedURL || signData?.signedUrl;
          if (rawPath) {
            signedUrl = rawPath.startsWith('http') 
              ? rawPath 
              : `${cleanUrl}${rawPath.startsWith('/storage') ? '' : '/storage/v1/object'}${rawPath}`;
          }
        }
      } catch (signErr) {
        console.warn('[Supabase Sign URL Warning]:', signErr);
      }

      if (!signedUrl) {
        signedUrl = `${cleanUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
      }

      console.log(`[Supabase Upload Proxy] Sucesso! URL assinada obtida:`, signedUrl);

      return res.status(200).json({
        status: 'ok',
        signedUrl
      });
    } catch (error: any) {
      console.error('[Supabase Upload Server Proxy Exception]:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Falha no servidor proxy de upload para Supabase'
      });
    }
  });

  // Vite middleware for development
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
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
