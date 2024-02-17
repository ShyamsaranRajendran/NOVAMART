const multer = require('multer');
const path = require('path');

// Define storage for gallery images
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const productId = req.params.id;
    const galleryDir = path.join('public', 'product_images', productId, 'gallery');
    cb(null, galleryDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});

// Create Multer instance for gallery image uploads
const uploadGallery = multer({ storage: galleryStorage });

module.exports = uploadGallery;
