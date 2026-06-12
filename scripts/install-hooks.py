#!/usr/bin/env python3
import os
import sys
import stat

def install_pre_commit_hook():
    print("[ZAYRON-X] Installing git pre-commit hook...")
    
    # Locate project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    git_dir = os.path.join(project_root, ".git")
    
    if not os.path.exists(git_dir):
        print("Error: Not a git repository (missing .git folder in workspace root).")
        return 1
        
    hooks_dir = os.path.join(git_dir, "hooks")
    os.makedirs(hooks_dir, exist_ok=True)
    
    pre_commit_path = os.path.join(hooks_dir, "pre-commit")
    
    # Define bash wrapper script content
    # This invokes the python scanner relative to the git repository top-level
    hook_content = (
        "#!/bin/sh\n"
        'python "$(git rev-parse --show-toplevel)/scripts/pre-commit-secrets-scan.py"\n'
    )
    
    try:
        with open(pre_commit_path, "w", encoding="utf-8") as f:
            f.write(hook_content)
            
        # Make the hook script executable (chmod +x equivalent)
        current_stat = os.stat(pre_commit_path)
        os.chmod(pre_commit_path, current_stat.st_mode | stat.S_IEXEC)
        
        print("Git pre-commit hook installed successfully!")
        print(f"   Location: {pre_commit_path}")
        return 0
    except Exception as e:
        print(f"Error writing hook file: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(install_pre_commit_hook())
