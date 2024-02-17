var mongoose = require('mongoose');

var GalleryImageSchema = mongoose.Schema({
    filename: {
        type: String,
        required: true
    }
});

// product schema
var productSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String
    },
    desc: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    galleryImages: [GalleryImageSchema]
});

var Product = module.exports = mongoose.model('product', productSchema);
