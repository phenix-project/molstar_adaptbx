from pathlib import Path
import subprocess
import shutil
import os


def main():
  # First check if the molstar repo exists in the expeected locaion (one level up from adaptbx)
  adaptbx_dir = Path(__file__).parent.parent
  molstar_path = adaptbx_dir.parent / "molstar"
  if not molstar_path.exists():
    print("ERROR: the molstar git repo not found")
   
  # If directory exists, assume it is the correct git repo. Copy files there:
  src = adaptbx_dir / "phenix-plugin"
  dst = molstar_path / "src/apps" / src.name
  print(f"Will copy phenix plugin directory:")
  print(f"\tfrom: {src}")
  print(f"\tto: {dst}")
  if dst.exists():
    print("Destination exists, removing...")
    shutil.rmtree(dst)
  print("Copying...")
  shutil.copytree(src,dst)
  


if __name__ == '__main__':
  main()
