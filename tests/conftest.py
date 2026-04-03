# Pytest configuration and fixtures

import sys
from pathlib import Path

# Add backend and project root to path for imports
project_root = Path(__file__).parent.parent
backend_path = project_root / "backend"
ml_path = project_root / "ml"

sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(ml_path))
sys.path.insert(0, str(project_root / "tests"))
