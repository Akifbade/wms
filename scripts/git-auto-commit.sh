#!/bin/sh
# Auto Git Commit Script - Watches for file changes and commits automatically

echo "🚀 Starting Auto Git Commit Watcher..."

# Configure Git
git config --global user.name "${GIT_USER_NAME:-WMS Auto Commit}"
git config --global user.email "${GIT_USER_EMAIL:-auto-commit@wms.local}"
git config --global --add safe.directory /workspace

# Function to commit changes
commit_changes() {
    cd /workspace
    
    # Check if there are changes
    if [ -n "$(git status --porcelain)" ]; then
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        
        # Get changed files
        changed_files=$(git status --porcelain | wc -l)
        
        # Add all changes
        git add -A
        
        # Create detailed commit message
        commit_msg="✅ Auto-commit checkpoint - $timestamp

Changes: $changed_files file(s) modified
$(git status --porcelain | head -20)

---
Automated checkpoint by Docker Git Watcher"
        
        # Commit
        git commit -m "$commit_msg"
        
        echo "✅ Committed changes at $timestamp ($changed_files files)"
        
        # Push to remote if configured
        if [ "$GIT_AUTO_PUSH" = "true" ]; then
            git push origin $(git branch --show-current) 2>/dev/null && \
                echo "📤 Pushed to remote" || \
                echo "⚠️  Could not push to remote (normal if no remote configured)"
        fi
    fi
}

# Initial commit of any existing changes
echo "📝 Checking for initial changes..."
commit_changes

# Watch for file changes
echo "👀 Watching for file changes..."
echo "⏱️  Commit interval: ${GIT_COMMIT_INTERVAL:-300} seconds"

while true; do
    # Wait for specified interval
    sleep ${GIT_COMMIT_INTERVAL:-300}
    
    # Commit any changes
    commit_changes
done
