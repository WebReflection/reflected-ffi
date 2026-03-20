
import os
os.unlink(__file__)

from setuptools import setup, find_packages

setup(
  name="reflected_ffi",
  version="0.0.1",
  packages=find_packages(),
  description="A remotely reflected Foreign Function Interface",
  author="Andrea Giammarchi",
  install_requires=[],
)


