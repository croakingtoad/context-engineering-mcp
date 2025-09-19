#!/bin/bash

# Sync script for Cole Medin's context-engineering-intro templates
# This script sets up and updates the git subtree integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTERNAL_DIR="$PROJECT_ROOT/external"
SUBTREE_DIR="$EXTERNAL_DIR/context-engineering-intro"
REPO_URL="https://github.com/coleam00/context-engineering-intro.git"

echo "Context Engineering Template Sync Script"
echo "========================================"

# Create external directory if it doesn't exist
mkdir -p "$EXTERNAL_DIR"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository. Please run 'git init' first."
    exit 1
fi

# Function to set up git subtree
setup_subtree() {
    echo "Setting up git subtree for context-engineering-intro..."

    # Add the subtree
    git subtree add --prefix="external/context-engineering-intro" "$REPO_URL" main --squash

    echo "✓ Git subtree added successfully"
}

# Function to update existing subtree
update_subtree() {
    echo "Updating existing git subtree..."

    # Pull latest changes
    git subtree pull --prefix="external/context-engineering-intro" "$REPO_URL" main --squash

    echo "✓ Git subtree updated successfully"
}

# Function to validate subtree setup
validate_subtree() {
    if [ -d "$SUBTREE_DIR" ] && [ "$(ls -A "$SUBTREE_DIR")" ]; then
        echo "✓ Subtree directory exists and is not empty"
        return 0
    else
        echo "✗ Subtree directory missing or empty"
        return 1
    fi
}

# Main logic
if [ -d "$SUBTREE_DIR" ] && [ "$(ls -A "$SUBTREE_DIR" 2>/dev/null)" ]; then
    echo "Existing subtree found. Updating..."
    update_subtree
else
    echo "No existing subtree found. Setting up..."
    setup_subtree
fi

# Validate the result
if validate_subtree; then
    echo ""
    echo "Template sync completed successfully!"
    echo "Templates are available in: $SUBTREE_DIR"

    # List available content
    echo ""
    echo "Available content:"
    find "$SUBTREE_DIR" -type f -name "*.md" -o -name "*.json" | head -10 | while read -r file; do
        echo "  - $(basename "$file")"
    done

    if [ "$(find "$SUBTREE_DIR" -type f \( -name "*.md" -o -name "*.json" \) | wc -l)" -gt 10 ]; then
        echo "  ... and more"
    fi
else
    echo "❌ Template sync failed!"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Review the templates in external/context-engineering-intro"
echo "2. Run 'npm run build' to build the project"
echo "3. Run 'npm test' to validate the setup"