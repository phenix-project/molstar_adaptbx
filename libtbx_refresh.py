from __future__ import absolute_import, division, print_function
from pathlib import Path
import libtbx.load_env
import shutil

# Copy files from 'molstar_adaptbx' to 'molstar' that are relevant to Phenix
adaptbx_dir = libtbx.env.find_in_repositories(relative_path="molstar_adaptbx")
molstar_dir = libtbx.env.find_in_repositories(relative_path="molstar")

if adaptbx_dir is not None:
  adaptbx_dir = Path(adaptbx_dir)
  molstar_dir = Path(molstar_dir)
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
    #"scripts/deploy.js",
    #"src/mol-model-props/computed/interactions/interactions.ts",
  ]
  for file in files:
    src = src_prefix / file
    dst = dst_prefix / file
    #print("Copy file:")
    #print(src," to ")
    #print(dst)
    dst.parent.mkdir(exist_ok=True,parents=True)
    shutil.copy(src, dst)
