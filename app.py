from pathlib import Path
import importlib.util
import sys


BACKEND_DIR = Path(__file__).resolve().parent / "backend"
BACKEND_APP = BACKEND_DIR / "app.py"

sys.path.insert(0, str(BACKEND_DIR))

spec = importlib.util.spec_from_file_location("ohara_backend_app", BACKEND_APP)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
