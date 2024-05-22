const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Class for dynamically compressing images based on a JSON file
 */
class DynamicCompressImage {
  constructor(maxSize) {
    this.maxSize = maxSize; // Maximum size in bytes
  }

  /**
   * Compress a single image
   * @param {Object} image - The image data object
   * @returns {number} - The new size in bytes
   */
  async compressImage(image) {
    const { path: imagePath, extension, width } = image;

    try {
      let data;

      if (width > 1500) {
        // Scale down images wider than 1500 pixels
        data = await sharp(imagePath)
          .resize({ width: 1400, withoutEnlargement: true }) // Resize to 1400px wide
          .toBuffer();
      } else {
        data = await sharp(imagePath).toBuffer();
      }

      // Compress image if it is still larger than the maxSize
      if (data.length > this.maxSize) {
        if (extension === '.jpg' || extension === '.jpeg') {
          data = await sharp(data)
            .jpeg({ quality: 80 }) // Compress JPEG with 80% quality
            .toBuffer();
        } else if (extension === '.png') {
          data = await sharp(data)
            .png({ compressionLevel: 9 }) // Compress PNG with highest compression
            .toBuffer();
        }

        // Further reduce quality if the size is still greater than maxSize
        if (data.length > this.maxSize) {
          if (extension === '.jpg' || extension === '.jpeg') {
            data = await sharp(data)
              .jpeg({ quality: 60 }) // Further compress JPEG to 60% quality
              .toBuffer();
          } else if (extension === '.png') {
            data = await sharp(data)
              .png({ compressionLevel: 9 }) // Further compress PNG
              .toBuffer();
          }
        }
      }

      await sharp(data).toFile(imagePath); // Overwrite the original file with compressed data

      return fs.statSync(imagePath).size;
    } catch (error) {
      console.error(`Error compressing ${imagePath}:`, error);
      throw error;
    }
  }

  /**
   * Determine if an image should be compressed based on its size string
   * @param {string} sizeStr - The size string (e.g., "2.37 MB", "512 KB")
   * @returns {boolean} - True if the image should be compressed, false otherwise
   */
  shouldCompress(sizeStr) {
    if (sizeStr.includes('KB')) {
      const sizeInKB = parseFloat(sizeStr.replace(' KB', '').trim());
      return sizeInKB > 250;
    } else {
      return true; // Assume MB or GB
    }
  }

  /**
   * Compress images based on a JSON file
   * @param {string} jsonFilePath - The path to the JSON file containing image data
   */
  async compressImagesFromJson(jsonFilePath) {
    const images = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    for (const image of images) {
      if (this.shouldCompress(image.size)) {
        try {
          const newSize = await this.compressImage(image);
          console.log(`Compressed: ${image.path} to ${this.formatSize(newSize)} from ${image.size}`);
        } catch (error) {
          console.error(`Error compressing ${image.path}:`, error);
        }
      } else {
        console.log(`Skipped: ${image.path} (Size: ${image.size}, Width: ${image.width})`);
      }
    }
  }

  /**
   * Convert size to a human-readable format
   * @param {number} size - The size in bytes
   * @returns {string} - The formatted size
   */
  formatSize(size) {
    if (size < 1024) {
      return `${size} Bytes`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
}

module.exports = DynamicCompressImage;
