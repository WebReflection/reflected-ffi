from remote import reflected

module = reflected()

### for testing purposes

# simulating a callback
f = module.Handler(123)
f('a', [1, 2, 3], b=4)

# simulating a dictionary
d = module.Handler(456)
"a" in d

# simulating a list
l = module.Handler(789)
for i in range(0, len(l)):
    print(l[i])

if not l: 
    print("l is empty")

l[0]
l[0] = 123

l.asd
l.asd = 123

print(isinstance(l, f))

next(l)

del l[0]
del l.asd
