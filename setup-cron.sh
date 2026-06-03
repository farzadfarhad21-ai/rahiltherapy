#!/bin/bash
# setup-cron.sh
# Sets up daily cron job for daily-automation.js at 8am

SCRIPT_DIR="/Users/farzaden/Downloads/ruflow-project/raheleh_project"
LOG_FILE="$SCRIPT_DIR/logs/automation.log"

CRON_CMD="0 8 * * * cd $SCRIPT_DIR && node daily-automation.js >> $LOG_FILE 2>&1"

echo "📅 Setting up daily automation cron job (8am)"
echo ""
echo "This will add the following cron job:"
echo "$CRON_CMD"
echo ""
echo "The automation will:"
echo "  1. Pick a trending Persian mental health topic"
echo "  2. Generate a blog article"
echo "  3. Post to Telegram channel"
echo "  4. Update sitemap.xml"
echo "  5. Deploy to Vercel"
echo "  6. Log everything to logs/automation.log"
echo ""

read -p "Continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# Add cron job (removes existing first)
(crontab -l 2>/dev/null | grep -v "daily-automation.js"; echo "$CRON_CMD") | crontab -

echo "✅ Cron job installed!"
echo ""
echo "To edit manually: crontab -e"
echo "To view existing:  crontab -l"
echo "Logs at: $LOG_FILE"
echo ""
echo "To test run manually: node daily-automation.js"