#!/bin/bash

# Seed script via API - versão corrigida
# Cria dados de teste usando os endpoints da API

API_URL="http://localhost:3000/api"

echo "🌱 Seeding test data via API..."
echo ""

# 1. Register test user
echo "👤 Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@turion.dev",
    "password": "password123",
    "name": "Test User",
    "tenantName": "Test Company"
  }')

JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ "$JWT_TOKEN" == "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ Registration failed"
  echo "  Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User registered with JWT: ${JWT_TOKEN:0:30}..."
echo ""

# 2. Get current user info (includes tenant ID)
echo "👤 Fetching user profile..."
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$ME_RESPONSE" | jq .

USER_ID=$(echo "$ME_RESPONSE" | jq -r '.id' 2>/dev/null)
TENANT_ID=$(echo "$ME_RESPONSE" | jq -r '.tenantId' 2>/dev/null)

if [ "$USER_ID" == "null" ] || [ "$TENANT_ID" == "null" ]; then
  echo "⚠️  Could not extract IDs from response"
  echo "  Will proceed with API calls anyway"
fi

echo ""
echo "📋 Summary:"
echo "   User ID: $USER_ID"
echo "   Tenant ID: $TENANT_ID"
echo "   Email: test@turion.dev"
echo ""

# 3. Get stage config
if [ "$TENANT_ID" != "null" ] && [ ! -z "$TENANT_ID" ]; then
  echo "⚙️  Fetching stage config (atendimento)..."
  CONFIG_RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/config?stage=atendimento" \
    -H "Authorization: Bearer $JWT_TOKEN")

  echo "$CONFIG_RESPONSE" | jq .
  echo ""

  # 4. Update stage config
  echo "🔧 Updating stage config..."
  UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/tenants/$TENANT_ID/config?stage=atendimento" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "config": {
        "tone": "empathetic",
        "cta_style": "soft",
        "template_fallback": "Olá {name}, estamos processando sua solicitação. Por favor tente novamente.",
        "guardrails": {
          "on": true,
          "max_tokens": 256,
          "blocked_topics": []
        },
        "questions": [
          "Como posso ajudá-lo?",
          "Qual é sua dúvida?"
        ]
      }
    }')

  echo "$UPDATE_RESPONSE" | jq .
  echo ""

  # 5. Rotate secret
  echo "🔑 Rotating tenant secret..."
  SECRET_RESPONSE=$(curl -s -X POST "$API_URL/tenants/$TENANT_ID/secrets/rotate" \
    -H "Authorization: Bearer $JWT_TOKEN")

  TENANT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.secret' 2>/dev/null)
  echo "$SECRET_RESPONSE" | jq .
  echo ""

  # 6. Get usage
  echo "📊 Getting usage stats..."
  USAGE_RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/usage" \
    -H "Authorization: Bearer $JWT_TOKEN")

  echo "$USAGE_RESPONSE" | jq .
  echo ""

  # 7. Test simulator
  echo "🧪 Testing simulator (atendimento stage)..."
  TEST_RESPONSE=$(curl -s -X POST "$API_URL/tenants/$TENANT_ID/test" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "stage": "atendimento",
      "message_original": "Olá, preciso de ajuda com meu pedido",
      "name": "Maria",
      "origin": "whatsapp"
    }')

  echo "$TEST_RESPONSE" | jq .
  echo ""

  # 8. Test another stage
  echo "🧪 Testing simulator (cobranca stage)..."
  TEST_RESPONSE2=$(curl -s -X POST "$API_URL/tenants/$TENANT_ID/test" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "stage": "cobranca",
      "message_original": "Qual é meu saldo?",
      "name": "João",
      "origin": "whatsapp"
    }')

  echo "$TEST_RESPONSE2" | jq .
  echo ""
fi

echo "✨ Seeding completed!"
echo ""
echo "📝 Test Credentials:"
echo "   Email: test@turion.dev"
echo "   Password: password123"
echo ""
if [ ! -z "$TENANT_ID" ] && [ "$TENANT_ID" != "null" ]; then
  echo "🏢 Test Tenant:"
  echo "   ID: $TENANT_ID"
  echo ""
fi
if [ ! -z "$TENANT_SECRET" ] && [ "$TENANT_SECRET" != "null" ]; then
  echo "🔑 Tenant Secret (save this for webhook signing!):"
  echo "   $TENANT_SECRET"
  echo ""
fi
echo "🔐 JWT Token (expires in 7 days):"
echo "   $JWT_TOKEN"
echo ""
echo "📊 Available endpoints:"
echo "   GET    /api/auth/me - Current user"
echo "   GET    /api/tenants/:id/config - Get stage config"
echo "   PUT    /api/tenants/:id/config - Update stage config"
echo "   POST   /api/tenants/:id/test - Test simulator"
echo "   GET    /api/tenants/:id/usage - Get usage stats"
echo "   POST   /api/tenants/:id/secrets/rotate - Rotate secret"
echo ""
echo "🚀 Test curl commands:"
echo ""
echo "# Get user info"
echo "curl -X GET 'http://localhost:3000/api/auth/me' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN'"
echo ""
echo "# Test simulator"
echo "curl -X POST 'http://localhost:3000/api/tenants/$TENANT_ID/test' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"stage\": \"atendimento\", \"message_original\": \"Olá\", \"name\": \"Maria\"}'"
