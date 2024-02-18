var express = require('express');
var router = express.Router();
const path = require('path');
const multer = require('multer');
const mkdirp = require('mkdirp');
const fs = require('fs');
const util = require('util');
const unlink = util.promisify(fs.unlink);

// Get product model
var Product = require('../models/product.js'); 
var Category = require('../models/category.js'); 
const uploadGallery = require('./GalleryStore');
// Get product index 
router.get('/', async (req, res, next) => {
    try {
        const count = await Product.countDocuments({});
        const products = await Product.find({}).exec();
        res.render('admin/products', { products, count });
    } catch (error) {
        console.error('Error counting products:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get add product
router.get('/add-product', async (req, res) => {
    try {
        const categories = await Category.find().exec();
        res.render('admin/add_product', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/product_images/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
}



router.post('/add-product', upload.single('image'), async (req, res) => {
  try {
    const { title, desc, price, category } = req.body;
    const image = req.file ? req.file.filename : '';

   // Check if any required field is missing and flash a message for each missing field
   if (!title) {
    req.flash('danger', 'Title is required.');
  }
  if (!desc) {
    req.flash('danger', 'Description is required.');
  }
  if (!price) {
    req.flash('danger', 'Price is required.');
  }
  if (!category) {
    req.flash('danger', 'Category is required.');
  }
  if (!image) {
    req.flash('danger', 'Image is required.');
  }

  // If any required field is missing, redirect back to the add-product product
  if (!title || !desc || !price || !category || !image) {
    return res.redirect('/admin/products/add-product');
  }

    // Create a new product instance
    const newProduct = new Product({
      title: title,
      slug: title.toLowerCase(),
      desc: desc,
      price: price,
      image: image,
      category: category 
    });

    // Save the product to the database
    await newProduct.save();

    // Create directories for product images
    const productId = newProduct._id;
    await mkdirp('public/product_images/' + productId + '/gallery', { recursive: true });
    await mkdirp('public/product_images/' + productId + '/gallery/thumbs', { recursive: true });

    // Move uploaded image to the appropriate directory
    if (image !== "") {
      const imagePath = 'public/product_images/' + productId + '/' + image;

      // Move the image file
      fs.rename(req.file.path, imagePath, err => {
        if (err) {
          console.error('Error moving image:', err);
          req.flash('danger', 'Error moving image.');
          return res.redirect('/admin/products/add-product');
        }
      });
    }

    req.flash('success', 'Product added successfully.');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error adding product:', error);
    req.flash('danger', 'Error adding product.');
    res.redirect('/admin/products/add-product');
  }
});


// Get edit product
router.get('/edit-product/:_id', async function(req, res) {
  try {
    var errors;
    if (req.session.errors) errors = req.session.errors;
    req.session.errors = null;

    const categories = await Category.find();
    const product = await Product.findOne({ _id: req.params._id });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const galleryDir = 'public/product_images/' + product._id + '/gallery';
    
    // Read the directory asynchronously
    fs.readdir(galleryDir, function(err, files){
      if(err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      } 
      
      // If no error, proceed with rendering the view
      const galleryImages = files;
      res.render('admin/edit_product', {
        title: product.title,
        errors: errors,
        desc: product.desc,
        categories: categories,
        category: product.category.replace(/\s+/g , '-').toLowerCase(),
        price: product.price,
        image: product.image,
        galleryImages: galleryImages, 
        product: product 
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// Post edit-product
router.post('/edit-product/:id', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const { title, desc, price, category } = req.body;

    // Find the product by its _id
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      req.flash('danger', 'Product not found.');
      return res.redirect('/admin/products');
    }

    // Check if a new image is uploaded
    if (req.file) {
      // Delete the existing image if it exists
      if (product.image) {
        const imagePath = path.join('public/product_images', productId, product.image);
        fs.unlinkSync(imagePath);
      }

      // Set the new image file name
      product.image = req.file.filename;

      // Move the uploaded image to the destination directory
      const destinationDir = path.join('public/product_images', productId);
      await mkdirp(destinationDir);
      fs.renameSync(req.file.path, path.join(destinationDir, req.file.filename));
    }

    // Update the product fields
    product.title = title;
    product.slug= title.toLowerCase();
    product.desc = desc;
    product.price = price;
    product.category = category;

    // Save the updated product
    await product.save();

    req.flash('success', 'Product updated successfully.');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error updating product:', error);
    req.flash('danger', 'Error updating product.');
    res.redirect('/admin/products');
  }
});

// POST route to handle updating the product gallery
router.post('/edit-product/:id/gallery', uploadGallery.array('gallery', 5), async (req, res) => {
  try {
    const productId = req.params.id;
    const images = req.files; // Array of uploaded files

    // Find the product by its ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send('Product not found.');
    }

    // Check if there are uploaded images
    if (!images || images.length === 0) {
      return res.status(400).send('No images uploaded.');
    }

    // Save the filenames to the database
    images.forEach(async (image) => {
      const newGalleryImage = {
        filename: image.filename
      };
      product.galleryImages.push(newGalleryImage);
    });

    // Save the updated product with gallery images
    await product.save();

    res.status(200).send('Gallery images uploaded and stored successfully.');
  } catch (error) {
    console.error('Error uploading gallery images:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST route to delete an image
router.post('/delete-image/:productId/:imageId', async (req, res) => {
  const { productId, imageId } = req.params;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the image to be deleted
    const image = product.galleryImages.find(img => img._id.toString() === imageId);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Get the filename of the image
    const filename = image.filename;

    // Remove the image from the product's galleryImages array
    product.galleryImages = product.galleryImages.filter(img => img._id.toString() !== imageId);

    // Save the updated product
    await product.save();

    // Construct the path to the image file
    const imagePath = path.join(__dirname, '..', 'public', 'product_images', productId, 'gallery', filename);

    // Check if the file exists before attempting to delete it
    if (fs.existsSync(imagePath)) {
      // Delete the image file
      fs.unlinkSync(imagePath);
      console.log('Image file deleted:', imagePath); // Log success message
    } else {
      console.log('Image file not found:', imagePath); // Log file not found
    }

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Delete Product and Associated Images
router.get('/delete-product/:id', async function(req, res) {
  try {
    const productId = req.params.id;

    // Find the product by its ID
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }

    // Retrieve the image file name
    const imageName = product.image;

    // Retrieve the gallery images
    const galleryImages = product.galleryImages;

    // Delete the product from the database
    await Product.findByIdAndDelete(productId);

    // If the product had an associated image
    if (imageName) {
      // Construct the path to the image directory
      const imageDir = path.join('public/product_images', productId);

      // Check if the image directory exists before attempting to delete
      if (fs.existsSync(imageDir)) {
        // Delete the image file and its directory
        await fs.promises.rm(imageDir, { recursive: true });
      }
    }

    // Delete associated gallery images and their directories
    await Promise.all(galleryImages.map(async (image) => {
      const imageDir = path.join('public/product_images', productId, 'gallery', image.filename);
      // Check if the image directory exists before attempting to delete
      if (fs.existsSync(imageDir)) {
        await fs.promises.rm(imageDir, { recursive: true });
      }
    }));

    req.flash('success', 'Product and associated images deleted');
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete product and associated images');
    res.redirect('/admin/products');
  }
});

module.exports = router;
