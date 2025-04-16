from __future__ import absolute_import, division, print_function
from pathlib import Path
import libtbx.load_env
import shutil
import os
import json
import subprocess
from libtbx.program_template import ProgramTemplate

class Program(ProgramTemplate):

  master_phil_str = """

  """

  datatypes = ['phil']

  def validate(self):
    pass


  def run(self):
    # First check if the molstar repo exists in the expected location
    # (one level up from adaptbx)
    adaptbx_dir = libtbx.env.find_in_repositories(relative_path="molstar_adaptbx") # this module
    molstar_dir = libtbx.env.find_in_repositories(relative_path="molstar") # molstar repo
    build_dir = Path(molstar_dir).parent.parent / "build" # phenix build directory
    if not adaptbx_dir:
      raise Sorry("molstar_adaptbx directory not found")
    if not molstar_dir:
      raise Sorry("molstar directory not found")
    if not build_dir:
      raise Sorry("build directory not found")
    adaptbx_dir = Path(adaptbx_dir)
    molstar_dir = Path(molstar_dir)
    build_molstar = build_dir / "molstar" # molstar subdirectory inside phenix build

    self._print("Directory paths:")
    self._print("molstar_adaptbx module: "+str(adaptbx_dir))
    self._print("molstar git repository: "+str(molstar_dir))
    self._print("phenix build directory: "+str(build_dir))
    self._print("molstar build parent: "+str(build_molstar))
    if build_molstar.exists():
      self._print("** removing existing molstar build parent **")
      shutil.rmtree(build_molstar)
    self._print("** copying new molstar build parent **")
    shutil.copytree(molstar_dir,build_molstar)
    molstar_build = build_molstar / "build" # molstar build directory under phenix build
    if not molstar_build.exists():
      molstar_build.mkdir(parents=True)
    self._print("molstar build: "+str(molstar_build))
    self._print("")
    # Install js dependencies
    self._print("Building molstar...")
    cd = os.getcwd()
    self._print("Changing to directory: "+str(build_molstar))
    os.chdir(build_molstar)

    # Install nodejs dependencies
    npm_bin_path = f"npm"
    commands = [ ]

    commands += [
        [f"{npm_bin_path}  install", "--prefix {molstar_dir}"],
    ]

    commands += [
      [f"{npm_bin_path} run clean",f" --prefix {molstar_dir}"],
      [f"{npm_bin_path} run build",f" --prefix {molstar_dir}"],
    ]
    for command in commands:
      
      self._print("Running command: "+" ".join(command))
      subprocess.run(command,shell=True)
    self._print("Changing directory to: "+str(cd))
    os.chdir(cd)
    self._print("Done.\n\n")
