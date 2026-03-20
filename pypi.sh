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

' > setup.py

npm run build:py

if [ "$1" = "publish" ]; then
    python -m twine upload --verbose --repository reflected_ffi pypi/*
else
    cat setup.py 
fi

rm -f setup.py

# echo '<!DOCTYPE html>
# <html lang="en">
#     <head>
#         <meta charset="utf-8">
#         <meta name="viewport" content="width=device-width,initial-scale=1">
#         <title>reflected_ffi</title>
#         <link rel="stylesheet" href="https://pyscript.net/releases/2025.11.2/core.css">
#         <script type="module">
#           import { encode, decode } from "https://esm.run/reflected-ffi/direct";

#           globalThis.encode = encode;

#           // MicroPython does not integrate bytes or bytearray properly
#           // but it is possible to iterate via their proxy wrapper
#           globalThis.decode = value => decode("_ref" in value ? value : [...value]);

#           // be sure PyScript core is imported after global utilities are defined
#           await import("https://pyscript.net/releases/2025.11.2/core.js");
#         </script>
#     </head>
#     <body>
#         <mpy-config>
#           packages = ["./reflected_ffi-0.0.1-py3-none-any.whl"]
#         </mpy-config>
#         <py-config>
#           packages = ["./reflected_ffi-0.0.1-py3-none-any.whl"]
#         </py-config>
#         <script type="mpy">
#           import js
#           from datetime import datetime
#           from reflected_ffi.direct import encode, decode
#           print("py", decode(encode(datetime.now())))
#           print("js", decode(js.encode(js.Date.new())))
#           js.console.log(js.decode(encode(datetime.now())))
#         </script>
#     </body>
# </html>


# ' > pypi/index.html

# # TODO: this is needed only in coincident
# unzip -o ./pypi/reflected_ffi-0.0.1-py3-none-any.whl -d ./pypi/
# cp -R ./pypi/reflected_ffi ~/git/coincident/src/server/
