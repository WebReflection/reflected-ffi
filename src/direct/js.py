import io
from datetime import datetime

def now():
  return int(datetime.now().timestamp() * 1000)

class Null:
  def __bool__(self, *args, **kwargs):
    return False

  def __eq__(self, *args, **kwargs):
    return args[0] is Null

  def __hash__(self, *args, **kwargs):
    return -hash(None)

  def __repr__(self, *args, **kwargs):
    return 'Null'

  def __str__(self, *args, **kwargs):
    return 'Null'

# differently from None, Null is an immutable singleton
# that does not returns True from `if Null` checks
# and it guarantees to not fail `is Null` checks
Null = Null()

class Map(dict): pass

class Set(list):
  def add(self, value):
    if value not in self:
      self.append(value)

# C-Python compatibility
try:
  str().__new__

  class Blob(io.BytesIO):
    type = ''
    size = 0

    def __new__(cls, buffer, options=None):
      if options is None or options is Null:
        options = {}

      this = str.__new__(cls, buffer)
      this.stype = options.get('type', '')
      this.size = options.get('size', len(buffer))
      return this


  class File(Blob):
    name = ''
    lastModified = 0

    def __new__(cls, buffer, name, options=None):
      if options is None or options is Null:
        options = {}

      this = super().__new__(cls, buffer, options)
      this.name = name
      this.lastModified = options.get('lastModified', now())
      return this


  class Symbol(str):
    def __new__(cls, name):
      return str.__new__(cls, f'Symbol[{len(name)}].{name}')

# MicroPython compatibility
except:
  class Blob(io.BytesIO):
    type = ''
    size = 0
  
    def __init__(self, buffer, options=None):
      if options is None or options is Null:
        options = {}

      super().__init__(buffer)
      self.type = options.get('type', '')
      self.size = options.get('size', len(buffer))


  class File(Blob):
    name = ''
    lastModified = 0

    def __init__(self, buffer, name, options=None):
      if options is None or options is Null:
        options = {}

      super().__init__(buffer, options)
      self.name = name
      self.lastModified = options.get('lastModified', now())


  class Symbol(str):
    def __init__(self, name):
      super().__init__(f'Symbol[{len(name)}].{name}')


symbols = {}

for _ in ["asyncIterator", "hasInstance", "isConcatSpreadable", "iterator", "match", "matchAll", "replace", "search", "species", "split", "toPrimitive", "toStringTag", "unscopables", "dispose", "asyncDispose"]:
  symbol = Symbol(f'@{_}')
  symbols[symbol] = symbol

del _
