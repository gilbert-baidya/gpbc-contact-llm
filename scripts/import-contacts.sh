#!/bin/bash

# Import contacts from CSV file

if [ -z "$1" ]; then
    echo "Usage: ./scripts/import-contacts.sh <csv-file-path>"
    echo "Example: ./scripts/import-contacts.sh ~/Downloads/contacts.csv"
    exit 1
fi

CSV_FILE="$1"

if [ ! -f "$CSV_FILE" ]; then
    echo "Error: File not found: $CSV_FILE"
    exit 1
fi

echo "Importing contacts from: $CSV_FILE"
echo ""

curl -X POST "http://localhost:8000/api/contacts/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$CSV_FILE"

echo ""
echo ""
echo "✅ Import complete! Check the dashboard at http://localhost:3000"
