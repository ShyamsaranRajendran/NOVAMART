var express =require('express');
var router = express.Router();
// Get product model
var Product = require('../models/product.js'); 


router.get('/add-to-cart/:product', async function(req, res) {
    try {
        const slug = req.params.product; // Extract the product slug from the request parameters

        // Find the product in the database using the slug
        const product = await Product.findOne({ slug: slug });
        if (!product) {
            throw new Error('Product not found');
        }

        // Retrieve the cart from the session
        let cart = req.session.cart || [];

        // Check if the product already exists in the cart
        const existingProductIndex = cart.findIndex(item => item.title === product.title);
        if (existingProductIndex !== -1) {
            // If the product exists in the cart, increase its quantity
            cart[existingProductIndex].qty++;
        } else {
            // If the product is not found in the cart, add it to the cart with quantity 1
            cart.push({
                title: product.title,
                qty: 1, // Initial quantity is 1
                price: parseFloat(product.price).toFixed(2),
                image: '/product_images/' + product._id +'/' + product.image
            });
        }

        // Update the cart in the session
        req.session.cart = cart;

        // Log the updated cart
        console.log(req.session.cart);

        // Flash message indicating successful addition of the product to the cart
        req.flash('success', 'Product added to the cart');

        // Redirect the user back to the previous page
        res.redirect('back');

    } catch (error) {
        console.error('Error finding page:', error);
        res.status(500).send('Internal Server Error');
    }
});




// Get checkout page

router.get('/checkout', async function(req, res) {

    res.render('checkout',{
        title: 'Checkout',
        cart: req.session.cart
    });
});

router.get('/update/:product',function(req,res){
    var slug = req.params.product;
    var cart=req.session.cart;
    var action=req.query.action;

    for(var i=0;i< cart.length;i++)
    {
        if(cart[i].title == slug)
        {
            switch(action){
                case "add":
                    cart[i].qty++;
                case "remove":
                    cart[i].qty--;
                case "clear":
                    cart.splice(i,1);
                    if(cart.length == 0) delete req.session.cart
                    break;
                default:
                    console.log('update problem');
                    break;
            }
        }
    }

})
//Exports 
module.exports=router;