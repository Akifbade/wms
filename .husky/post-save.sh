#!/bin/sh
# Auto-commit and push changes after file save

# Check if there are any changes
if [ -n "$(git status --porcelain)" ]; then
  echo "🔍 Detecting changes..."
  
  # Add all changes
  git add .
  
  # Commit with timestamp
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  git commit -m "auto: Local changes at $TIMESTAMP" --no-verify
  
  # Push to current branch
  BRANCH=$(git branch --show-current)
  echo "📤 Pushing to $BRANCH..."
  git push origin "$BRANCH"
  
  echo "✅ Auto-commit and push complete!"
else
  echo "ℹ️  No changes detected"
fi
