from direct import Null, decode, decoder

if Null: print('Null is True')
if Null is None: print('Null is None')
a = ()
if a is Null: print('None is Null')
if () == Null: print(() == None)
if 0 == Null: print(0 == None)
if False == Null: print(False == None)
if Null is not Null: print('Null is not Null')
if Null != Null: print('Null != Null')

d = decoder()

b = bytes([
   15, 3, 0, 0, 0,   5,   1,  21,
   13, 3, 0, 0, 0,  97, 115, 100,
   13, 4, 0, 0, 0, 105, 109, 115,
  117, 5, 3
])

decoded = d(len(b), b)

print(decoded)

print(decoded[1].__class__)

# print(decoded[2].__class__)
# # decoded[7][0] = 4
# # print(decoded[7][0])
