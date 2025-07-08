from __future__ import absolute_import, division, print_function
from pathlib import Path
import shutil
import os
import subprocess



def run(build_dir="../../../build",molstar_repo_dir="../../molstar"):
  """
  Params:
    build_dir: the relative path (relative to this source file) of phenix build directory
    molstar_repo_dir: the relative path (from this source file) of molstar git repo
  """

  build_dir = Path(Path(__file__).parent / build_dir).absolute()
  adaptbx_dir = Path(__file__).parent.parent.absolute()
  molstar_dir = Path(Path(__file__).parent / molstar_repo_dir).absolute()

  if not molstar_dir.exists():
    assert False, "Must have 'molstar' directory present first"
  if not adaptbx_dir:
    assert False, "molstar_adaptbx directory not found"
  if not molstar_dir:
    assert False, "molstar directory not found"
  if not build_dir:
    assert False, "build directory not found"
  adaptbx_dir = Path(adaptbx_dir).absolute()
  molstar_dir = Path(molstar_dir).absolute()
  build_molstar = Path(build_dir).absolute() / "molstar" # molstar subdirectory inside phenix build

  print("Directory paths:")
  print("phenix build dir:")
  print("\t",str(build_dir))
  print("molstar_adaptbx module:")
  print("\t",str(adaptbx_dir))
  print("molstar git repository:")
  print("\t",str(molstar_dir))
  print("phenix build directory:")
  print("\t",str(build_dir))
  print("molstar build parent:")
  print("\t",str(build_molstar))

  
  if not build_molstar.exists():
    print("** copying new molstar build parent **")
    shutil.copytree(molstar_dir,build_molstar)
  build_molstar_build = build_molstar / "build" # molstar build directory under phenix build
  if not build_molstar_build.exists():
    build_molstar_build.mkdir(parents=True)
  print("molstar build: ")
  print("\t",str(build_molstar_build))
  print()
  print("Copying adaptbx files:")
  #  Copy phenix specific folders and files to build directory
  src_prefix = adaptbx_dir / "molstar"
  dst_prefix = build_molstar
  files = [
    "src/apps/phenix-viewer/app.ts",
    "src/apps/phenix-viewer/favicon.ico",
    "src/apps/phenix-viewer/helpers.ts",
    "src/apps/phenix-viewer/index.html",
    "src/apps/phenix-viewer/index.ts",
    "src/apps/phenix-viewer/api.ts",
    "src/apps/phenix-viewer/phenix.ts",
    "src/phenix/server.js",
    "package.json",
    "webpack.config.js",
    "webpack.config.production.js",
    "webpack.config.viewer.js",
    #"scripts/deploy.js",
    #"src/mol-model-props/computed/interactions/interactions.ts", 
    # ^ edit to hide auto H-bonds
  ]
  for file in files:
    src = src_prefix / file
    dst = dst_prefix / file
    dst.parent.mkdir(exist_ok=True,parents=True)
    print(src,">",dst)
    shutil.copy(src, dst)
  print("Done.")
  print()
  print("Building molstar...")
  print("Changing to directory: "+str(build_molstar))
  os.chdir(build_molstar)

  # Install nodejs dependencies
  npm_bin_path = '`conda run -p "$CONDA_PREFIX" which npm`' 

  commands = [
    [npm_bin_path+"  install", "--prefix "+str(molstar_dir)],
    [npm_bin_path+" run clean",f" --prefix "+str(molstar_dir)],
    [npm_bin_path+" run build",f" --prefix "+str(molstar_dir)],
  ]
  for command in commands:
    print("Running command: "+" ".join(command))
    subprocess.run(command,shell=True)

  print("Done.\n\n")

if __name__ == "__main__":
  run()
