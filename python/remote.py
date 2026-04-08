def reflected(reflect=lambda id, trap, args=[], kwargs=None: print("reflect", id, trap, args, kwargs)):
    import builtins
    import weakref
    from builtins import isinstance as _isinstance
    from .types import DIRECT, REMOTE, ERROR, FUNCTION

    def isinstance(self, type):
        types = [type] if not _isinstance(type, (list, tuple)) else type
        types = [t for t in types if _isinstance(t, Handler)]

        if len(types) > 0:
            reflect(self._, "__isinstance__", [t._ for t in types])

        return False

    builtins.isinstance = lambda self, type: isinstance(self, type) if id(self) in handlers else _isinstance(self, type)

    def finalize(_id, _ref):
        def cleanup():
            handlers.pop(_id)
            reflect(_ref, "__unref__")

        return cleanup


    def from_value(value):
        if not _isinstance(value, list):
            return value

        t, v = value

        if t == DIRECT:
            return v

        if t == ERROR:
            raise Exception(v)

        if v is None:
            return reflected.builtins

        return handlers[v]() if v in handlers else Handler(v)

    def to_value(value):
        if value is None:
            return None

        if _isinstance(value, (bool, int, float, str, bytes, bytearray, tuple)):
            return value

        if _isinstance(value, Handler):
            return [REMOTE, value._]

        if _isinstance(value, Exception):
            return [ERROR, str(value)]

        if _isinstance(value, list):
            return [DIRECT, list_values(value)]

        if callable(value):
            return [FUNCTION, id(value)]

        return [DIRECT, dict_values(value)]

    list_values = lambda value: [to_value(v) for v in value]
    dict_values = lambda value: {k: to_value(v) for k, v in value.items()}

    handlers = {}

    class Handler:
        def __init__(self, _):
            object.__setattr__(self, "_", _)
            _id = id(self)
            handlers[_id] = weakref.ref(self)
            weakref.finalize(self, finalize(_id, _))

        def __bool__(self):
            return reflect(self._, "__bool__")

        def __call__(self, *args, **kwargs):
            return from_value(reflect(self._, "__call__", list_values(args), dict_values(kwargs)))

        def __delattr__(self, name):
            return reflect(self._, "__delattr__", [name])

        def __delitem__(self, name):
            return reflect(self._, "__delitem__", [name])

        def __getattr__(self, name):
            return from_value(reflect(self._, "__getattr__", [name]))

        def __hash__(self):
            return reflect(self._, "__hash__")

        def __getitem__(self, index):
            return from_value(reflect(self._, "__getitem__", [index]))

        def __mul__(self, other):
            return from_value(reflect(self._, "__mul__", [other]))

        def __rmul__(self, other):
            return from_value(reflect(self._, "__rmul__", [other]))

        def __setattr__(self, name, value):
            reflect(self._, "__setattr__", [name, to_value(value)])

        def __setitem__(self, index, value):
            reflect(self._, "__setitem__", [index, to_value(value)])

        def __str__(self):
            return reflect(self._, "__str__")

        def __repr__(self):
            return reflect(self._, "__repr__")

        def __format__(self, format_spec):
            return reflect(self._, "__format__", [format_spec])

        def __next__(self):
            return from_value(reflect(self._, "__next__"))

        def __iter__(self):
            def iterator():
                value = from_value(reflect(self._, "__iter__"))
                if value is None:
                    return

                yield value

            return iterator()

        def __len__(self):
            return reflect(self._, "__len__")

    # This is due MicroPython (?) shenanigan around referring to a known class thing
    _reflect = reflect

    class Reflected:
        def __init__(self):
            self.Handler = Handler
            self.builtins = Handler(None)

        def __import__(self, name):
            return from_value(_reflect(None, "__import__", [name]))

        def reflect(self, id, trap, args=[], kwargs=None):
            if trap == "__call__":
                fn = handlers[id]()
                args = [from_value(a) for a in args]
                kwargs = {k: from_value(v) for k, v in kwargs.items()}
                return to_value(fn(*args, **kwargs))

            if trap == "__unref__":
                handlers.pop(id)
                return

    reflected = Reflected()
    return reflected
