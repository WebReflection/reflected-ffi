import re
from datetime import datetime

import os, sys
sys.path.append(os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))
from src.direct import Symbol, symbols, Blob, Null, decode, decoder, encode, encoder
from src.direct.js import FinalizationRegistry

if FinalizationRegistry.WEAKREF:
  fr = FinalizationRegistry(lambda v: print('finalizing', v))
  import weakref
  o = lambda *a, **k: print('lambda', a, k)
  wr = weakref.ref(o)
  fr.register(o, 'o', wr)
  # fr.unregister(wr)
  del o

from src import local
local()

if Null: print('Null is True')
if Null is None: print('Null is None')
a = ()
if a is Null: print('None is Null')
if () == Null: print(() == None)
if 0 == Null: print(0 == None)
if False == Null: print(False == None)
if Null is not Null: print('Null is not Null')
if Null != Null: print('Null != Null')

byteOffset = 0
d = decoder(byteOffset)
e = encoder(byteOffset)

# b = bytes(([0] * byteOffset) + [
#    15, 3, 0, 0, 0,   5,   1,  21,
#    13, 3, 0, 0, 0,  97, 115, 100,
#    13, 4, 0, 0, 0, 105, 109, 115,
#   117, 5, 3
# ])

#print(d(len(b), b))

val = b'abc'
l, r, = e(re.compile('', re.I))
_ = d(l, r)
print(l, r, ' -> ', _, type(_), f'pattern: {_.pattern} - flags: {_.flags}')

# decoded = d(len(b), b)

# print(decoded)

# print(decoded[1].__class__)

# print(decoded[2].__class__)
# # decoded[7][0] = 4
# # print(decoded[7][0])
