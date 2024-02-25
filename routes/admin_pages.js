var express = require('express');
var router = express.Router();
const { check, validationResult } = require('express-validator');
const flash = require('connect-flash');
var auth = require('../config/auth');
var isAdmin = auth.isAdmin;
// Get Page model
var Page = require('../models/pages.js'); // Assuming correct path and filename

router.get('/',isAdmin, function(req, res) {
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

router.get('/add-page',isAdmin, function(req, res) {
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
router.post('/add-page',isAdmin, [
  check('title', 'Title must not be empty').not().isEmpty()
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
              Page.find({}).sort({ sorting: 1 }).exec() // Remove the callback function from exec()
              .then(pages => {
                res.app.locals.pages =pages;
               })
              .catch(err => {
                  console.error(err);
                    res.status(500).send('Internal Server Error');
                  });

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
router.post('/reorder-pages',isAdmin, async function(req, res) {
  var ids = req.body['id[]'];

  try {
      for (let index = 0; index < ids.length; index++) {
          const id = ids[index];
          const page = await Page.findById(id);
          page.sorting = index + 1;
          await page.save();
      }
      Page.find({}).sort({ sorting: 1 }).exec() // Remove the callback function from exec()
        .then(pages => {
          res.app.locals.pages =pages;
         })
        .catch(err => {
            console.error(err);
              res.status(500).send('Internal Server Error');
            });
      console.log('Pages reordered successfully.');
      res.sendStatus(200); // Send success response
  } catch (error) {
      console.error('Error reordering pages:', error);
      res.status(500).send('Internal Server Error'); // Send error response
  }
});


// Get edit page
router.get('/edit-page/:slug',isAdmin, function(req, res) {
  Page.findOne({slug: req.params.slug})
    .then(page => {
      if (!page) {
        // Handle the case where no page with the given slug is found
        return res.status(404).send("Page not found");
      }

      res.render('admin/edit_page', {
        title: page.title,
        slug: page.slug,
        content: page.content,
        id: page._id
      });
    })
    .catch(err => {
      // Handle errors
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});



// Post edit-page
router.post('/edit-page/:slug',isAdmin, [
  check('title', 'Title must not be empty').not().isEmpty(),
  check('content', 'Content must not be empty').not().isEmpty(),
], function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // If there are validation errors, render the form again with error messages
    res.render('admin/edit_page', {
      errors: errors.array(),
      title: req.body.title,
      slug: req.body.slug,
      content: req.body.content,
      id: req.body.id // Define id from the request body,
      
    });
  } else {
    // If validation passes, proceed with your logic
    const id = req.body.id; // Define id from the request body
    Page.findOne({ slug: req.body.slug, _id: { '$ne': id } })
      .then(page => {
        if (page) {
          req.flash('danger', 'Page slug exists, choose another.');
          res.redirect('/admin/pages/edit-page/' + req.body.slug); // Redirect back to the edit page with the slug
        } else {
          return Page.findById(id); // Find the page by ID
        }
      })
      .then(page => {
        if (!page) {
          // Handle the case where no page with the given ID is found
          return res.status(404).send("Page not found");
        }
      
        // Update page properties
        page.title = req.body.title;
        page.slug = req.body.slug;
        page.content = req.body.content;
        Page.find({}).sort({ sorting: 1 }).exec() // Remove the callback function from exec()
        .then(pages => {
          res.app.locals.pages =pages;
         })
        .catch(err => {
            console.error(err);
              res.status(500).send('Internal Server Error');
            });
        // Save the updated page
        return page.save()
          .then(updatedPage => {
            // Redirect to the admin pages route after successfully updating the page
            req.flash('success', 'Page edited');
            res.redirect('/admin/pages/edit-page/' + updatedPage.slug); // Redirect to the edit page
          });
      })
      .catch(err => {
        // Handle errors
        console.error(err);
        req.flash('danger', 'Error editing page.');
        res.redirect('/admin/pages');
      });
  }
});


// Delete Page

router.get('/delete-page/:id', isAdmin,function(req, res) {
  Page.findOneAndDelete({ _id: req.params.id })
    .exec()
    .then(deletedPage => {
      if (deletedPage) {
        Page.find({}).sort({ sorting: 1 }).exec() // Remove the callback function from exec()
        .then(pages => {
          res.app.locals.pages =pages;
         })
        .catch(err => {
            console.error(err);
              res.status(500).send('Internal Server Error');
            });
        req.flash('success', 'Page deleted');
      } else {
        req.flash('error', 'Page not found');
      }
      res.redirect('/admin/pages');
    })
    .catch(err => {
      console.error(err);
      req.flash('error', 'Failed to delete page');
      res.redirect('/admin/pages');
    });
});





// Exports
module.exports = router;
