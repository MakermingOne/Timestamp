// 简化的 EXIF 读取器，适用于微信小程序
// 基于 ExifReader 的核心功能简化

const ExifTags = {
  // 常用 EXIF 标签
  DateTimeOriginal: 0x9003,
  DateTime: 0x0132,
  DateTimeDigitized: 0x9004,
  ImageWidth: 0x0100,
  ImageHeight: 0x0101,
  Make: 0x010f,
  Model: 0x0110,
  Orientation: 0x0112,
  GPSLatitude: 0x8825
};

class ExifReader {
  static read(buffer) {
    const view = new DataView(buffer);
    const length = buffer.byteLength;
    
    // 检查 JPEG 标记
    if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) {
      throw new Error('不是有效的 JPEG 文件');
    }

    let offset = 2;
    const result = {};

    while (offset < length) {
      // 查找标记
      if (view.getUint8(offset) !== 0xFF) {
        offset++;
        continue;
      }

      const marker = view.getUint8(offset + 1);

      // APP1 标记 (EXIF)
      if (marker === 0xE1) {
        const exifData = this.parseExifSegment(view, offset);
        Object.assign(result, exifData);
      }

      // SOI, EOI 或其他无长度标记
      if (marker === 0xD8 || marker === 0xD9) {
        offset += 2;
        continue;
      }

      // 跳过当前段
      const segmentLength = view.getUint16(offset + 2, false);
      offset += 2 + segmentLength;
    }

    return result;
  }

  static parseExifSegment(view, offset) {
    const segmentLength = view.getUint16(offset + 2, false);
    const segmentEnd = offset + 2 + segmentLength;
    
    // 检查 EXIF 标识
    const exifId = this.getString(view, offset + 4, 4);
    if (exifId !== 'Exif') {
      return {};
    }

    // TIFF 头偏移
    let tiffOffset = offset + 10;
    
    // 字节序
    const byteOrder = this.getString(view, tiffOffset, 2);
    const littleEndian = byteOrder === 'II';

    // TIFF 标识
    const tiffId = view.getUint16(tiffOffset + 2, littleEndian);
    if (tiffId !== 0x002A) {
      return {};
    }

    // IFD0 偏移
    const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
    
    // 解析 IFD0
    const ifd0Data = this.parseIFD(view, tiffOffset + ifd0Offset, littleEndian, tiffOffset);
    
    // 查找 Exif IFD 指针
    const exifIFDPointer = ifd0Data[0x8769];
    if (exifIFDPointer) {
      const exifData = this.parseIFD(view, tiffOffset + exifIFDPointer, littleEndian, tiffOffset);
      Object.assign(ifd0Data, exifData);
    }

    // 格式化结果
    const result = {};
    
    if (ifd0Data[ExifTags.DateTimeOriginal]) {
      result.DateTimeOriginal = this.parseDateTime(ifd0Data[ExifTags.DateTimeOriginal]);
    }
    if (ifd0Data[ExifTags.DateTime]) {
      result.DateTime = this.parseDateTime(ifd0Data[ExifTags.DateTime]);
    }
    if (ifd0Data[ExifTags.DateTimeDigitized]) {
      result.DateTimeDigitized = this.parseDateTime(ifd0Data[ExifTags.DateTimeDigitized]);
    }
    if (ifd0Data[ExifTags.Make]) {
      result.Make = ifd0Data[ExifTags.Make];
    }
    if (ifd0Data[ExifTags.Model]) {
      result.Model = ifd0Data[ExifTags.Model];
    }
    if (ifd0Data[ExifTags.Orientation]) {
      result.Orientation = ifd0Data[ExifTags.Orientation];
    }

    return result;
  }

  static parseIFD(view, offset, littleEndian, tiffOffset) {
    const numEntries = view.getUint16(offset, littleEndian);
    const result = {};
    
    let entryOffset = offset + 2;

    for (let i = 0; i < numEntries; i++) {
      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

      const value = this.readValue(view, tag, type, count, valueOffset, littleEndian, tiffOffset);
      if (value !== null) {
        result[tag] = value;
      }

      entryOffset += 12;
    }

    return result;
  }

  static readValue(view, tag, type, count, valueOffset, littleEndian, tiffOffset) {
    // 简单类型处理
    const typeSizes = {
      1: 1, // BYTE
      2: 1, // ASCII
      3: 2, // SHORT
      4: 4, // LONG
      5: 8, // RATIONAL
      7: 1, // UNDEFINED
      9: 4, // SLONG
      10: 8  // SRATIONAL
    };

    const size = typeSizes[type] || 1;
    const totalSize = size * count;

    // 如果数据能放入 4 字节，直接存储在 valueOffset 中
    let dataOffset;
    if (totalSize <= 4) {
      dataOffset = view.byteOffset + (view.byteOffset === undefined ? 0 : 0) + 8;
      // 重新计算：value 在 entry 的最后 4 字节
      // 简单处理：使用 valueOffset 作为值（对于小数据）
    } else {
      dataOffset = tiffOffset + valueOffset;
    }

    switch (type) {
      case 2: // ASCII 字符串
        return this.readString(view, tiffOffset + valueOffset, count - 1);
      case 3: // SHORT
        return valueOffset;
      case 4: // LONG
        return valueOffset;
      default:
        return valueOffset;
    }
  }

  static getString(view, offset, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      const char = view.getUint8(offset + i);
      if (char === 0) break;
      result += String.fromCharCode(char);
    }
    return result;
  }

  static readString(view, offset, length) {
    return this.getString(view, offset, length);
  }

  static parseDateTime(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // EXIF 时间格式: "2025:03:13 14:30:00"
    const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;

    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
}

module.exports = ExifReader;
