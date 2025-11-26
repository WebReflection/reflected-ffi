#!/usr/bin/env sh

# to use this env type either:
# . env.sh
# or
# source env.sh

python -m venv env
source env/bin/activate
pip install --upgrade pip
pip install setuptools wheel

echo '
from setuptools import setup, find_packages

setup(
  name="reflected_ffi",
  version="0.0.1",
  packages=find_packages(),
  description="A remotely reflected Foreign Function Interface",
  author="Andrea Giammarchi",
  install_requires=[],
)

' > setup.py

npm run build:py

cp test/pypi.html pypi/index.html
rm -f setup.py
