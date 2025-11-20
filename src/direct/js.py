class Null(tuple):
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

  # mock None behavior
  def __getitem__(self, *args, **kwargs):
    return None.__getitem__(*args, **kwargs)
  def __setitem__(self, *args, **kwargs):
    return None.__setitem__(*args, **kwargs)
  def __delitem__(self, *args, **kwargs):
    return None.__delitem__(*args, **kwargs)
  def __len__(self, *args, **kwargs):
    return None.__len__(*args, **kwargs)
  def __contains__(self, *args, **kwargs):
    return None.__contains__(*args, **kwargs)
  def __iter__(self, *args, **kwargs):
    return None.__iter__(*args, **kwargs)
  def __next__(self, *args, **kwargs):
    return None.__next__(*args, **kwargs)
  def __reversed__(self, *args, **kwargs):
    return None.__reversed__(*args, **kwargs)
  def __add__(self, *args, **kwargs):
    return None.__add__(*args, **kwargs)
  def __radd__(self, *args, **kwargs):
    return None.__radd__(*args, **kwargs)
  def __mul__(self, *args, **kwargs):
    return None.__mul__(*args, **kwargs)
  def __rmul__(self, *args, **kwargs):
    return None.__rmul__(*args, **kwargs)
  def __truediv__(self, *args, **kwargs):
    return None.__truediv__(*args, **kwargs)
  def __rtruediv__(self, *args, **kwargs):
    return None.__rtruediv__(*args, **kwargs)
  def __floordiv__(self, *args, **kwargs):
    return None.__floordiv__(*args, **kwargs)
  def __rfloordiv__(self, *args, **kwargs):
    return None.__rfloordiv__(*args, **kwargs)
  def __mod__(self, *args, **kwargs):
    return None.__mod__(*args, **kwargs)
  def __rmod__(self, *args, **kwargs):
    return None.__rmod__(*args, **kwargs)
  def __pow__(self, *args, **kwargs):
    return None.__pow__(*args, **kwargs)
  def __rpow__(self, *args, **kwargs):
    return None.__rpow__(*args, **kwargs)
  def __lshift__(self, *args, **kwargs):
    return None.__lshift__(*args, **kwargs)
  def __rlshift__(self, *args, **kwargs):
    return None.__rlshift__(*args, **kwargs)
  def __rshift__(self, *args, **kwargs):
    return None.__rshift__(*args, **kwargs)
  def __rrshift__(self, *args, **kwargs):
    return None.__rrshift__(*args, **kwargs)
  def __and__(self, *args, **kwargs):
    return None.__and__(*args, **kwargs)
  def __rand__(self, *args, **kwargs):
    return None.__rand__(*args, **kwargs)
  def __or__(self, *args, **kwargs):
    return None.__or__(*args, **kwargs)
  def __ror__(self, *args, **kwargs):
    return None.__ror__(*args, **kwargs)
  def __xor__(self, *args, **kwargs):
    return None.__xor__(*args, **kwargs)
  def __rxor__(self, *args, **kwargs):
    return None.__rxor__(*args, **kwargs)
  def __neg__(self, *args, **kwargs):
    return None.__neg__(*args, **kwargs)
  def __pos__(self, *args, **kwargs):
    return None.__pos__(*args, **kwargs)
  def __abs__(self, *args, **kwargs):
    return None.__abs__(*args, **kwargs)
  def __invert__(self, *args, **kwargs):
    return None.__invert__(*args, **kwargs)
  def __class__(self, *args, **kwargs):
    return None.__class__(*args, **kwargs)
  def __delattr__(self, *args, **kwargs):
    return None.__delattr__(*args, **kwargs)
  def __dir__(self, *args, **kwargs):
    return None.__dir__(*args, **kwargs)
  def __doc__(self, *args, **kwargs):
    return None.__doc__(*args, **kwargs)
  def __format__(self, *args, **kwargs):
    return None.__format__(*args, **kwargs)
  def __ge__(self, *args, **kwargs):
    return None.__ge__(*args, **kwargs)
  def __getattribute__(self, *args, **kwargs):
    return None.__getattribute__(*args, **kwargs)
  def __getstate__(self, *args, **kwargs):
    return None.__getstate__(*args, **kwargs)
  def __gt__(self, *args, **kwargs):
    return None.__gt__(*args, **kwargs)
  def __le__(self, *args, **kwargs):
    return None.__le__(*args, **kwargs)
  def __lt__(self, *args, **kwargs):
    return None.__lt__(*args, **kwargs)
  def __ne__(self, *args, **kwargs):
    return None.__ne__(*args, **kwargs)
  def __reduce__(self, *args, **kwargs):
    return None.__reduce__(*args, **kwargs)
  def __reduce_ex__(self, *args, **kwargs):
    return None.__reduce_ex__(*args, **kwargs)
  def __setattr__(self, *args, **kwargs):
    return None.__setattr__(*args, **kwargs)
  def __subclasshook__(self, *args, **kwargs):
    return None.__subclasshook__(*args, **kwargs)

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

  class Symbol(str):
    def __new__(cls, name):
      return str.__new__(cls, f'Symbol[{len(name)}].{name}')

# MicroPython compatibility
except:
  class Symbol(str):
    def __init__(self, name):
      super().__init__(f'Symbol[{len(name)}].{name}')


symbols = {}

for _ in ["asyncIterator", "hasInstance", "isConcatSpreadable", "iterator", "match", "matchAll", "replace", "search", "species", "split", "toPrimitive", "toStringTag", "unscopables", "dispose", "asyncDispose"]:
  symbol = Symbol(f'@{_}')
  symbols[symbol] = symbol

del _
