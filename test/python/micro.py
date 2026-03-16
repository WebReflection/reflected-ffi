from reflected_ffi import local, remote

worker = local(lambda id, trap, args=[], kwargs=None: server.reflect(id, trap, args, kwargs))
server = remote(lambda id, trap, args=[], kwargs=None: worker.reflect(id, trap, args, kwargs))

server_globals = server.builtins.globals()
server_print = server.builtins.print

server_print(server_globals)
#server.builtins.print(server_globals)
