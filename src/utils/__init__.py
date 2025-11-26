class JSMap:
  _k = []
  _v = []

  def __init__(self, pairs = []):
    self._k = []
    self._v = []
    for pair in pairs:
      self.set(pair[0], pair[1])

  def has(self, key):
    return key in self._k

  def get(self, key):
    if self.has(key):
      return self._v[self._k.index(key)]

  def set(self, key, value):
    if self.has(key):
      self[self.index(key) + 1] = value
    else:
      self._k.append(key)
      self._v.append(value)
    return self

  def __str__(self):
    return [pair for pair in self]

  def __repr__(self):
    return f"JSMap({self})"

  def __iter__(self):
    for i in range(0, len(self._k)):
      yield [self._k[i], self._v[i]]


identity = lambda value: value

tv = lambda type, value: [type, value]

array = []
object = {}
callback = lambda *args, **kwargs: None

def loop_values(as_value):
  def loop(arr, cache = None):
    if cache is None:
      cache = JSMap()

    for i in range(len(arr)):
      arr[i] = as_value(arr[i], cache)

    return arr

  return loop
