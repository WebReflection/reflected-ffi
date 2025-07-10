globalThis.ImageData ??= class ImageData {
  constructor(data, width, height, { colorSpace, pixelFormat }) {
    this.data = data;
    this.width = width;
    this.height = height;
    this.colorSpace = colorSpace;
    this.pixelFormat = pixelFormat;
  }
};
