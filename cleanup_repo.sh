#!/bin/bash

# Create backup directory
echo "Creating backup directory..."
mkdir -p env_backup

# Backup any important configuration from virtual environments if needed
# Add custom backup commands here if there are files that should be preserved from venvs

# Make sure environments are in gitignore
echo "Checking .gitignore..."
grep -q "trash_env/" .gitignore || echo "trash_env/" >> .gitignore
grep -q "venv/" .gitignore || echo "venv/" >> .gitignore
grep -q "ENV/" .gitignore || echo "ENV/" >> .gitignore

# Ensure we have a requirements.txt
echo "Ensuring requirements.txt exists..."
if [ ! -f requirements.txt ]; then
    echo "Creating requirements.txt..."
    # If in a Python environment, export dependencies
    if command -v pip &> /dev/null; then
        pip freeze > requirements.txt
    else
        echo "WARNING: pip not found, creating empty requirements.txt"
        touch requirements.txt
    fi
fi

# Remove virtual environments from Git tracking
echo "Removing virtual environments from Git tracking..."
git filter-branch --force --index-filter \
    "git rm -r --cached --ignore-unmatch trash_env venv ENV" \
    --prune-empty --tag-name-filter cat -- --all

# Clean up Git repository
echo "Cleaning up Git repository..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --aggressive --prune=now

echo "Done! Your repository has been cleaned up."
echo "Remember to force push with: git push origin --force --all" 