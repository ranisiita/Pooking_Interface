#!/bin/sh
# Injects runtime environment variables into assets/config.json
# so the Angular SPA can read them at startup without a rebuild.

CONFIG_FILE="/usr/share/nginx/html/assets/config.json"
mkdir -p "$(dirname "$CONFIG_FILE")"

cat > "$CONFIG_FILE" <<EOF
{
  "apiBaseUrl": "${API_BASE_URL:-https://api.pooking.com}",
  "enableMock": ${ENABLE_MOCK:-false}
}
EOF

echo "Runtime config.json generated:"
cat "$CONFIG_FILE"
