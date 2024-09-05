import subprocess

def run_command(command):
  """Utility function to run a shell command and print the output in real-time."""
  process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
  while True:
    output = process.stdout.readline()
    if output == "" and process.poll() is not None:
      break
    if output:
      print(output.strip())
  return process.poll()

def create_conda_env(env_name):
  """Create a new conda environment."""
  print(f"Creating a new environment '{env_name}'...")
  run_command(f"conda create --name {env_name} -y")

def install_package_in_env(env_name, package_name):
  """Install the desired package in a conda environment."""
  print(f"Installing package '{package_name}' in environment '{env_name}'...")
  run_command(f"conda install --name {env_name} {package_name} -y")

def run_command_in_env(env_name, command):
  """Run a list of commands in a conda environment."""
  print(f"Running command '{command}' in environment '{env_name}'...")
  result = run_command(f"conda run --name {env_name} {command}")
  print(f"Command result: {result}")

def get_conda_env_directory(env_name):
  result = subprocess.run(['conda', 'env', 'list'], capture_output=True, text=True)
  
  # Find the environment path
  for line in result.stdout.splitlines():
    if env_name in line:
      # Extract the path to the environment
      env_path = line.split()[-1]
      return env_path
  
  return None

