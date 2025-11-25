from direct import Symbol, symbols, Null, decode, decoder, encode, encoder

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

b = bytes(([0] * byteOffset) + [
   15, 3, 0, 0, 0,   5,   1,  21,
   13, 3, 0, 0, 0,  97, 115, 100,
   13, 4, 0, 0, 0, 105, 109, 115,
  117, 5, 3
])

print(d(len(b), b))

l, r, = e(memoryview(b'abc'))
_ = d(l, r)
print(l, r, ' -> ', _, type(_))

# decoded = d(len(b), b)

# print(decoded)

# print(decoded[1].__class__)

# print(decoded[2].__class__)
# # decoded[7][0] = 4
# # print(decoded[7][0])
