var express = require('express');
var router = express.Router();
const { check, validationResult } = require('express-validator');

// Get Page model
var Page = require('../models/pages.js'); // Assuming correct path and filename

router.get('/', function(req, res) {
  Page.find({}).sort({ sorting: 1 }).exec() // Remove the callback function from exec()
    .then(pages => {
      res.render('admin/pages', {
        pages: pages
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});

// Get add page

router.get('/add-page', function(req, res) {
  var title = "";
  var slug = "";
  var content = "";

  res.render('admin/add_page', {
    title: title,
    slug: slug,
    content: content
  });
});

// Post add-page
router.post('/add-page', [
  check('title', 'Title must not be empty').not().isEmpty(),
  check('content', 'Content must not be empty').not().isEmpty(),
], function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // If there are validation errors, render the form again with error messages
    res.render('admin/add_page', {
      errors: errors.array(),
      title: req.body.title,
      slug: req.body.slug,
      content: req.body.content
    });
  } else {
    // If validation passes, proceed with your logic
    Page.findOne({ slug: req.body.slug })
      .then(page => {
        if (page) {
          req.flash('danger', 'Page slug exists, choose another.');
          res.redirect('/admin/pages'); // Assuming a redirect to the pages route
        } else {
          var newPage = new Page({
            title: req.body.title,
            slug: req.body.slug,
            content: req.body.content,
            sorting: 100
          });

          newPage.save()
            .then(() => {
              req.flash('success', 'Page added.');
              res.redirect('/admin/pages'); // Assuming a redirect to the pages route
            })
            .catch(err => {
              console.log("Error:", err);
              req.flash('danger', 'Error adding page.');
              res.redirect('/admin/pages'); // Assuming a redirect to the pages route
            });
        }
      })
      .catch(err => {
        console.log("Error:", err);
        req.flash('danger', 'Error checking page existence.');
        res.redirect('/admin/pages'); // Assuming a redirect to the pages route
      });
  }
});



//Post Recoder pages
router.post('/reorder-pages', async function(req, res) {
  var ids = req.body['id[]'];

  try {
      for (let index = 0; index < ids.length; index++) {
          const id = ids[index];
          const page = await Page.findById(id);
          page.sorting = index + 1;
          await page.save();
      }
      console.log('Pages reordered successfully.');
      res.sendStatus(200); // Send success response
  } catch (error) {
      console.error('Error reordering pages:', error);
      res.status(500).send('Internal Server Error'); // Send error response
  }
});


// Exports
module.exports = router;
