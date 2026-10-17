import sys
from pathlib import Path

# Add project root and it_incident to python search path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / "it_incident"))
