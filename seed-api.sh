#!/bin/bash

# Seed script via API
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

echo "$REGISTER_RESPONSE" | jq .

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id' 2>/dev/null)
TENANT_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.tenant.id' 2>/dev/null)

if [ "$USER_ID" == "null" ] || [ "$TENANT_ID" == "null" ]; then
  echo "❌ Registration failed"
  echo "  Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User created: $USER_ID"
echo "✅ Tenant created: $TENANT_ID"
echo ""

# 2. Login to get JWT
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@turion.dev",
    "password": "password123"
  }')

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ "$JWT_TOKEN" == "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ Login failed"
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ JWT Token obtained: ${JWT_TOKEN:0:20}..."
echo ""

# 3. Get current user
echo "👤 Fetching user profile..."
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$ME_RESPONSE" | jq .
echo ""

# 4. Get stage config
echo "⚙️  Fetching stage config..."
CONFIG_RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/config?stage=atendimento" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$CONFIG_RESPONSE" | jq .
echo ""

# 5. Update stage config
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

# 6. Rotate secret
echo "🔑 Rotating tenant secret..."
SECRET_RESPONSE=$(curl -s -X POST "$API_URL/tenants/$TENANT_ID/secrets/rotate" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$SECRET_RESPONSE" | jq .
TENANT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.secret' 2>/dev/null)
echo ""

# 7. Get usage
echo "📊 Getting usage stats..."
USAGE_RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/usage" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$USAGE_RESPONSE" | jq .
echo ""

# 8. Test simulator
echo "🧪 Testing simulator..."
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

echo "✨ Seeding completed!"
echo ""
echo "📝 Test Credentials:"
echo "   Email: test@turion.dev"
echo "   Password: password123"
echo ""
echo "🏢 Test Tenant:"
echo "   ID: $TENANT_ID"
echo ""
echo "🔑 Tenant Secret (save this!):"
echo "   $TENANT_SECRET"
echo ""
echo "🔐 JWT Token (valid for this session):"
echo "   $JWT_TOKEN"
echo ""
echo "🚀 Next: Use JWT token for authenticated requests"
