var express = require('express');
var router = express.Router();
const { check, validationResult } = require('express-validator');
const flash = require('connect-flash');



//Get Categories index

router.get('/', function(req, res) {
  Category.find()
   .then(categories => {
       res.render("admin/categories", {
           categories: categories
       });
   })
   .catch(err => {
       console.error(err);
       res.status(500).send("Internal Server Error");
   });
});

//Get add Category

router.get('/add-category', function(req, res) {
  var title = "";
  var slug = "";

  res.render('admin/add_category', {
      title: title,
      slug: slug
  });
});



const Category = require('../models/category'); // Import the Category model
const category = require('../models/category');

// Post add-category
router.post('/add-category', [
  check('title', 'Title must not be empty').not().isEmpty()
], function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // If there are validation errors, render the form again with error messages
    console.log("Validation errors:", errors.array());
    return res.status(400).render('admin/add_category', {
      errors: errors.array(),
      title: req.body.title
    });
  } else {
    // If validation passes, proceed with your logic
    const slug = req.body.title.toLowerCase(); // Using title as slug
    Category.findOne({ slug: slug })
      .then(category => {
        if (category) {
          req.flash('danger', 'Category slug exists, choose another.');
          res.redirect('/admin/categories'); // Redirect to the category management page
        } else {
          var newCategory = new Category({
            title: req.body.title,
            slug: slug // Using title as slug
          });

          newCategory.save()
            .then(() => {
              req.flash('success', 'Category added.');
              res.redirect('/admin/categories'); // Redirect to the category management page
            })
            .catch(err => {
              console.log("Error saving new category:", err);
              req.flash('danger', 'Error adding category.');
              res.redirect('/admin/categories'); // Redirect to the category management page
            });
        }
      })
      .catch(err => {
        console.log("Error finding category:", err);
        req.flash('danger', 'Error checking category existence.');
        res.redirect('/admin/categories'); // Redirect to the category management page
      });
  }
});

// Get edit category
router.get('/edit-category/:id', function(req, res) {
  Category.findById(req.params.id)
    .then(category => {
      if (!category) {
        // Handle the case where no category with the given ID is found
        return res.status(404).send("Category not found");
      }

      res.render('admin/edit_category', {
        title: category.title,
        id: category._id
      });
    })
    .catch(err => {
      // Handle errors
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});

// Post edit-category
router.post('/edit-category/:id', [
  check('title', 'Title must not be empty').not().isEmpty()
], function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // If there are validation errors, render the form again with error messages
    return res.render('admin/edit_category', {
      errors: errors.array(),
      title: req.body.title,
      id: req.params.id // Pass the category ID from the URL
    });
  } else {
    // If validation passes, proceed with your logic
    const id = req.params.id; // Get the category ID from the URL

    // Find the category by its ID
    Category.findById(id)
      .then(category => {
        if (!category) {
          // Handle the case where no category with the given ID is found
          return res.status(404).send("Category not found");
        }

        // Update category properties
        category.title = req.body.title;
        category.slug = req.body.title.toLowerCase(); // Fix typo in setting slug

        // Save the updated category
        return category.save();
      })
      .then(updatedCategory => {
        // Redirect to the edit category page after successfully updating the category
        req.flash('success', 'Category edited');
        res.redirect('/admin/categories/edit-category/' + updatedCategory.id);
      })
      .catch(err => {
        // Handle errors
        console.error(err);
        req.flash('danger', 'Error editing category.');
        res.redirect('/admin/categories');
      });
  }
});


// Delete Page

router.get('/delete-category/:id', function(req, res) {
  Category.findOneAndDelete({ _id: req.params.id })
    .exec()
    .then(deletedcategory => {
      if (deletedcategory) {
        req.flash('success', 'category deleted');
      } else {
        req.flash('error', 'category not found');
      }
      res.redirect('/admin/categories');
    })
    .catch(err => {
      console.error(err);
      req.flash('error', 'Failed to delete category');
      res.redirect('/admin/categories');
    });
});





// Exports
module.exports = router;

