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
    cb(null, 'public/product_images');
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
        product: product // Include the product object here
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

    // Update the product fields
    product.title = title;
    product.desc = desc;
    product.price = price;
    product.category = category;

    // Check if a new image is uploaded and it's different from the existing one
    if (req.file && req.file.filename !== product.image) {
      // Create the destination directory if it doesn't exist
      const destinationDir = `public/product_images/${productId}`;
      await mkdirp(destinationDir);

      // Move the uploaded image to the destination directory
      fs.renameSync(req.file.path, `${destinationDir}/${req.file.filename}`);

      // Set the new image file name
      product.image = req.file.filename;
    }

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

// Delete Product

router.get('/delete-product/:id', function(req, res) {
  const productId = req.params.id;

  Product.findByIdAndDelete(productId)
    .then(deletedProduct => {
      if (deletedProduct) {
        req.flash('success', 'Product deleted');
      } else {
        req.flash('error', 'Product not found');
      }
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.error(err);
      req.flash('error', 'Failed to delete product');
      res.redirect('/admin/products');
    });
});


module.exports = router;
