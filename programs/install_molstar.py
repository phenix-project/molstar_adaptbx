from __future__ import absolute_import, division, print_function
from pathlib import Path
import subprocess
import shutil
import os
import json
from libtbx.program_template import ProgramTemplate
from molstar_adaptbx.phenix.utils import (
  create_conda_env,
  install_package_in_env,
  run_command_in_env,
  run_command,
  get_conda_env_directory,
)

class Program(ProgramTemplate):

  master_phil_str = """


  fresh_install = False
    .type = bool
    .help = "Whether to delete the existing molstar directory and clone/install from scratch"

  molstar_env_name = molstar_env
    .type = str
    .help = "The name for the Python conda env used to install requirements"

  molstar_remote = git@github.com:molstar/molstar.git
    .type = str
    .help = "The remote repo address for molstar"

  clone_molstar_repo = True
    .type = bool
    .help = "If molstar_adaptbx/../molstar' does not exist, try to clone it"

  skip_env = False
    .type = bool
    .help = "If the 'molstar_env_name' exists as a conda environment, skip creation"
    
  skip_copy = False
    .type = bool
    .help = "Whether or not to copy files from adaptbx to molstar"

  skip_install = False
    .type = bool
    .help = "Whether or not to skip installing node dependencies"

  skip_build = False
    .type = bool
    .help = "Whether or not to skip typescript to javascript compilation"

  """

  datatypes = ['phil']

  def validate(self):
    pass

  def run(self):
    self._print("Being installation...")
    # First check if the molstar repo exists in the expeected locaion 
    # (one level up from adaptbx)
    adaptbx_dir = Path(__file__).parent.parent
    molstar_dir = adaptbx_dir.parent / "molstar"
    env_name = self.params.molstar_env_name
    if molstar_dir.exists() and self.params.fresh_install:
      self._print("Removing existing installation...")
      shutil.rmtree(molstar_dir)
      self._print("Done.\n\n")
    if not molstar_dir.exists():
      if self.params.clone_molstar_repo:
        command = f"git clone {self.params.molstar_remote} ../molstar"
        self._print(command)
        run_command(command,print_func=self._print)
      else:
        self._print("ERROR: the molstar git repo not found")
        return
    
    
    # If directory exists, assume it is the correct git repo. 
    #  Copy phenix specific folders and files there:
    if not self.params.skip_copy:
      # Folders
      src_prefix = adaptbx_dir / "molstar"
      dst_prefix = molstar_dir
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
        "scripts/deploy.js",
        "src/mol-model-props/computed/interactions/interactions.ts",
      ]
      for file in files:
        src = src_prefix / file
        dst = dst_prefix / file
        self._print(f"Copying file: {file}")
        self._print(f"\tSrc: {src}")
        self._print(f"\tDst: {dst}")
        dst.parent.mkdir(exist_ok=True,parents=True)
        shutil.copy(src, dst)
      self._print("Done.\n\n")
    
    # Install js dependencies
    #   1. Create a new conda env to get high nodejs versions
    #   2. Install nodejs
    #   3. run a series of npm commands using the conda nodejs
    self._print("Building molstar...")
    
    # Check if env name exists
    env_dir =  get_conda_env_directory(env_name,print_func=self._print)
    env_present = env_dir is not None
    if env_present and self.params.skip_env:
      create_env = False
    else:
      create_env = True

    if create_env:
      packages = [
        '"nodejs>=20"', # system nodejs version is likely to be too low
      ]
      # Create a fresh conda env to avoid dependency issues
      create_conda_env(env_name)
      env_dir = get_conda_env_directory(env_name,print_func=self._print)
      for package in packages:
        install_package_in_env(env_name, package,print_func=self._print)

    # Install nodejs dependencies
   
    npm_bin_path = f"{env_dir}/bin/npm"
    commands = [ ]

    if not self.params.skip_install:
      commands += [
        f"{npm_bin_path}  install --prefix {molstar_dir}",
    ]

    if not self.params.skip_build:
      commands += [
      f"{npm_bin_path} run clean --prefix {molstar_dir}",
      f"{npm_bin_path} run build --prefix {molstar_dir}",
    ] 
    for command in commands:
      run_command_in_env(env_name, command,print_func=self._print)
    self._print("Done.\n\n")

  def get_results(self):
    pass
