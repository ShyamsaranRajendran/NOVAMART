var express =require('express');
var router = express.Router();
// Get Page model
var Page = require('../models/pages.js'); 

router.get('/',async function(req,res){
    try {
        const slug = 'home';
        const page = await Page.findOne({ slug: slug });

       
        res.render('index', {
            title: page.title,
            content: page.content,
            user: req.user,
            page: page // Pass the page variable to the template
        });
    } catch (error) {
        console.error('Error finding page:', error);
        res.status(500).send('Internal Server Error');
    }
});


/*
GET
*/
router.get('/:slug', async function(req, res) {
    try {
        const slug = req.params.slug;
        const page = await Page.findOne({ slug: slug });

        if (!page) {
            return res.redirect('/');
        }
        
        res.render('index', {
            title: page.title,
            content: page.content,
            user: req.user,
            page: page // Pass the page variable to the template
        });
    } catch (error) {
        console.error('Error finding page:', error);
        res.status(500).send('Internal Server Error');
    }
});


//Exports 
module.exports=router;