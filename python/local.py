def reflected(reflect=lambda id, trap, args=[], kwargs=None: print("reflect", id, trap, args, kwargs)):
    import builtins
    from builtins import isinstance as _isinstance

    from .types import DIRECT, REMOTE, ERROR, FUNCTION

    def from_value(value):
        if not _isinstance(value, list):
            return value

        t, v = value

        if t == DIRECT:
            return v

        if t == ERROR:
            raise Exception(v)

        if t == FUNCTION:
            if not v in handlers:
                handlers[v] = lambda *args, **kwargs: reflect(v, "__call__", [to_value(a) for a in args], {k: to_value(v) for k, v in kwargs.items()})

            return handlers[v]

        if v is None:
            return builtins

        # REMOTE
        return handlers[v]

    def to_value(value):
        if value is None:
            return None

        if _isinstance(value, (bool, int, float, str, bytes, bytearray, tuple)):
            return value

        if _isinstance(value, Exception):
            return [ERROR, str(value)]

        _id = id(value)
        if _id in direct:
            # TODO: validate this does not conflict in practice with from_value lambda
            direct.pop(_id)
            return [DIRECT, value]

        if not _id in handlers:
            handlers[_id] = value

        return [REMOTE, _id]


    handlers = {}
    direct = {}

    class Reflected:
        def direct(self, value):
            direct[id(value)] = True

        def reflect(self, id, trap, args=[], kwargs=None):
            try:
                ref = builtins if id is None else handlers[id]

                if trap == "__isinstance__":
                    return isinstance(ref, (handlers[a] for a in args))

                    return False

                if trap == "__setattr__":
                    objrefect.__setattr__(ref, args[0], to_value(args[1]))
                    return True

                if trap == "__setitem__":
                    ref[args[0]] = to_value(args[1])
                    return True

                if trap == "__bool__":
                    return bool(ref)

                if trap == "__delattr__":
                    ref.__delattr__(args[0])
                    return True

                if trap == "__delitem__":
                    ref.__delitem__(args[0])
                    return True

                if trap == "__getattr__":
                    return to_value(getattr(ref, args[0]))

                if trap == "__getitem__":
                    return to_value(ref.__getitem__(args[0]))

                if trap == "__hash__":
                    return hash(ref)

                if trap == "__len__":
                    return len(ref)

                if trap == "__mul__":
                    return to_value(ref.__mul__(args[0]))

                if trap == "__rmul__":
                    return to_value(ref.__rmul__(args[0]))

                if trap == "__next__":
                    return to_value(ref.__next__())

                if trap == "__iter__":
                    return to_value(ref.__iter__())

                if trap == "__str__":
                    return str(ref)

                if trap == "__repr__":
                    return repr(ref)

                if trap == "__format__":
                    return format(ref, args[0])

                if trap == "__getattribute__":
                    return to_value(ref.__getattribute__(args[0]))

                if trap == "__getitem__":
                    return to_value(ref.__getitem__(args[0]))

                if trap == "__call__":
                    fn = ref
                    args = [from_value(a) for a in args]
                    kwargs = {k: from_value(v) for k, v in kwargs.items()}
                    return to_value(fn(*args, **kwargs))

                if trap == "__unref__":
                    if id in handlers:
                        handlers.pop(id)
                        return True

                    return False

                if trap == "__import__":
                    # runtime import to avoid MicroPython failure on __init__.py
                    from importlib import import_module
                    return to_value(import_module(args[0]))

            except Exception as e:
                return to_value(e)


    reflected = Reflected()
    return reflected
