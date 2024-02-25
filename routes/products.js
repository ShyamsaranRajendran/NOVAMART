var express =require('express');
var router = express.Router();
var Product = require('../models/product.js'); 
const Category = require('../models/category'); // Import the Category model
const { fstat } = require('fs-extra');
const fs=require('fs');
var auth = require('../config/auth');
var isUser = auth.isUser;
//get all products
router.get('/products', isUser,async function(req, res) {
    try {
        const products = await Product.find(); // Find all products

        res.render('all_products', {
            title: 'All Products',
            products: products ,// Pass the products array to the template
            user: req.user,
        });
    } catch (error) {
        console.error('Error finding products:', error);
        res.status(500).send('Internal Server Error');
    }
});



/*
GET product category
*/
router.get('/products/:category', async function(req, res) {
    try {
        var catslug = req.params.category;

        // Find the category by its slug
        const c = await Category.findOne({ slug: catslug });

        // If category not found, return 404
        if (!c) {
            return res.status(404).send('Category not found');
        }

        // Find all products belonging to the category
        const products = await Product.find({ category: catslug });

        // Render the view with the category title and products
        res.render('cat_products', {
            title: c.title,
            products: products,
            user: req.user
        });
    } catch (error) {
        console.error('Error finding products:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Product details route
router.get('/products/:category/:product', async function(req, res) {
    try {
        var galleryImages = null;
        const product = await Product.findOne({ slug: req.params.product }).exec();
        const loggedIn = (req.isAuthenticated()) ? true :false
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const galleryDir = `public/product_images/${product._id}/gallery/`;
        const files = await fs.promises.readdir(galleryDir);
        galleryImages = files;

        res.render('product', {
            title: product.title,
            p: product,
            galleryImages: galleryImages,
            loggedIn: loggedIn,
            user: req.user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



//Exports 
module.exports=router;