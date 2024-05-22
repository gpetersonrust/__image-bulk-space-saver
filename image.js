const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const DynamicCompressImage = require('./DynamicCompressImage');

/**
 * Class for collecting image data from a directory
 */
class ImageCollector {
  constructor(directory) {
    this.directory = directory;
    this.imageExtensions = ['.jpg', '.jpeg', '.png'];
  }

  /**
   * Check if a file is an image
   * @param {string} file - The file name
   * @returns {boolean} - True if the file is an image, false otherwise
   */
  isImage(file) {
    const ext = path.extname(file).toLowerCase();
    return this.imageExtensions.includes(ext);
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

  /**
   * Recursively get images from a directory
   * @param {string} dir - The directory path
   * @param {Array} fileList - The list of image data
   * @returns {Array} - The updated list of image data
   */
  async getImagesFromDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively search in subdirectory
        await this.getImagesFromDirectory(filePath, fileList);
      } else if (stat.isFile() && this.isImage(file)) {
        try {
          const metadata = await sharp(filePath).metadata();
          fileList.push({
            name: path.basename(file, path.extname(file)),
            path: filePath,
            size: this.formatSize(stat.size),
            sizeInBytes: stat.size,
            extension: path.extname(file),
            width: metadata.width,
            height: metadata.height
          });
        } catch (error) {
          console.error(`Error reading metadata of ${filePath}:`, error);
        }
      }
    }

    return fileList;
  }

  /**
   * Collect and save images data to a JSON file
   */
  async collectAndSaveImages() {
    const images = await this.getImagesFromDirectory(this.directory);
    console.log('Images found:', images);

    // Remove sizeInBytes property before saving to JSON
    const imagesToSave = images.map(({ sizeInBytes, ...rest }) => rest);

    // Write the images list to a JSON file
    const jsonFilePath = path.join(__dirname, 'imagePaths.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(imagesToSave, null, 2), 'utf-8');
    console.log(`Image paths have been saved to ${jsonFilePath}`);
  }
}

// Example usage with the parent directory of the current script
const directoryPath = path.join(__dirname, '..'); // Parent directory
const imageCollector = new ImageCollector(directoryPath);
imageCollector.collectAndSaveImages().then(() => {
  // Example usage
  const jsonFilePath = path.join(__dirname, 'imagePaths.json');
  const dynamicCompressor = new DynamicCompressImage(250 * 1024); // 250 KB
  dynamicCompressor.compressImagesFromJson(jsonFilePath);
});
