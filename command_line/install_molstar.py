from __future__ import absolute_import, division, print_function
from pathlib import Path
import shutil
import os
import json
import subprocess



def run(build_dir="../../build"):
  # Installation assumes that a molstar git repository is in the same
  # direcitory as the molstar_adaptbx folder
  adaptbx_dir = Path(__file__).parent.parent.absolute()
  molstar_dir = adaptbx_dir.parent / "molstar"

  if not molstar_dir.exists():
    assert False, "Must have 'molstar' directory present first"
  if not adaptbx_dir:
    assert False, "molstar_adaptbx directory not found"
  if not molstar_dir:
    assert False, "molstar directory not found"
  if not build_dir:
    assert False, "build directory not found"
  adaptbx_dir = Path(adaptbx_dir)
  molstar_dir = Path(molstar_dir)
  build_molstar = Path(build_dir).absolute() / "molstar" # molstar subdirectory inside phenix build

  print("Directory paths:")
  print("molstar_adaptbx module: "+str(adaptbx_dir))
  print("molstar git repository: "+str(molstar_dir))
  print("phenix build directory: "+str(build_dir))
  print("molstar build parent: "+str(build_molstar))

  
  if not build_molstar.exists():
    print("** copying new molstar build parent **")
    shutil.copytree(molstar_dir,build_molstar)
  molstar_build = build_molstar / "build" # molstar build directory under phenix build
  if not molstar_build.exists():
    molstar_build.mkdir(parents=True)
  print("molstar build: "+str(molstar_build))
  print("")
  # Install js dependencies
  print("Building molstar...")
  print("Changing to directory: "+str(build_molstar))
  os.chdir(build_molstar)

  # Install nodejs dependencies
  npm_bin_path = f"npm"
  commands = [ ]

  commands += [
      [f"{npm_bin_path}  install", "--prefix {molstar_dir}"],
    [f"{npm_bin_path} run clean",f" --prefix {molstar_dir}"],
    [f"{npm_bin_path} run build",f" --prefix {molstar_dir}"],
  ]
  for command in commands:
    print("Running command: "+" ".join(command))
    subprocess.run(command,shell=True)
  print("Done.\n\n")

if __name__ == "__main__":
  run()