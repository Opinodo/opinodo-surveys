#!/bin/sh
echo "Checking database connection..."
npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
if [ $? -eq 0 ]; then
  echo "Database connection successful!"
  exit 0
else
  echo "Database connection failed!"
  exit 1
fi
