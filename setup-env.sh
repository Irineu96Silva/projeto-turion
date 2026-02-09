#!/bin/bash

# Setup script para gerar variáveis de ambiente

echo "🚀 Setup Turion API - Gerador de Variáveis"
echo "==========================================="
echo ""

# JWT_SECRET (gerar 64 caracteres aleatórios)
echo "📝 Gerando JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 48)
echo "✅ JWT_SECRET gerado"
echo ""

# MASTER_KEY (32 bytes = 64 hex chars para AES-256-GCM)
echo "🔐 Gerando MASTER_KEY (AES-256-GCM)..."
MASTER_KEY=$(openssl rand -hex 32)
echo "✅ MASTER_KEY gerado"
echo ""

# Criar .env
cat > .env << EOF
# ── Database (PostgreSQL - Neon/Supabase) ──────────────
DATABASE_URL=postgresql://user:password@host:5432/turion?sslmode=require

# ── Auth ───────────────────────────────────────────────
JWT_SECRET=$JWT_SECRET

# ── Encryption (32 bytes hex = 64 hex chars for AES-256-GCM) ──
MASTER_KEY=$MASTER_KEY

# ── Motor V1 (n8n on VPS) ─────────────────────────────
MOTOR_URL=http://YOUR_VPS_IP:5678/webhook/shpKwVVC9j0s8HAi/webhook/engine/run
MOTOR_TIMEOUT_MS=10000

# ── Server ─────────────────────────────────────────────
PORT=3000
FRONTEND_URL=https://master.turion-web.pages.dev
EOF

echo ""
echo "✅ .env criado!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Edite .env com seus valores reais:"
echo "   DATABASE_URL: sua conexão PostgreSQL"
echo "   MOTOR_URL: URL do seu n8n na VPS"
echo "   FRONTEND_URL: URL do seu frontend (já setado para Cloudflare Pages)"
echo ""
echo "2. Depois rode:"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
echo "3. Verifique os logs:"
echo "   docker-compose logs -f api"
echo ""
echo "4. Teste a API:"
echo "   curl http://localhost:3000/api"
echo ""
