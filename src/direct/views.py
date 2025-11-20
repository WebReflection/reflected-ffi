import struct

BIG_INT_64_MAX = 9223372036854775807
BIG_UINT_64_MAX = 18446744073709551615

def endianness(littleEndian):
  return 'little' if littleEndian else 'big'

# MicroPython fallback
as_number = lambda num: int(num) if num.is_integer() else num
try:
  float(0).is_integer()
except:
  as_number = lambda num: num if num != int(num) else int(num)

class DataView:
  def __init__(self, buffer):
    self.buffer = buffer

  def getBigInt64(self, byteOffset, littleEndian):
    bui = self.getBigUint64(byteOffset, littleEndian)
    if bui > BIG_INT_64_MAX:
      return bui - (BIG_UINT_64_MAX + 1)
    else:
      return bui

  def getBigUint64(self, byteOffset, littleEndian):
    bo = endianness(littleEndian)
    return int.from_bytes(self.buffer[byteOffset:byteOffset+8], byteorder=bo)

  def getFloat64(self, byteOffset, littleEndian):
    bo = endianness(littleEndian)
    i = int.from_bytes(self.buffer[byteOffset:byteOffset+8], byteorder=bo)
    return as_number(struct.unpack('d', i.to_bytes(8, byteorder=bo))[0])

  def getUint32(self, byteOffset, littleEndian):
    bo = endianness(littleEndian)
    return int.from_bytes(self.buffer[byteOffset:byteOffset+4], byteorder=bo)

u8a8 = [0] * 8
dv = DataView(u8a8)
