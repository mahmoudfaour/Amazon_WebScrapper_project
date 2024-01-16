const mongoose = require('mongoose');
//creating the schema of the product databse table 
let productScheme = new mongoose.Schema({
    title : String,
    newprice : String,
    oldprice : String,
    newstock : String,//here we use these attributes to tell the user if the product is back or out of stock 
    oldstock : String,
    sku : String,//this the unique code for the product that the user enter
    company : String,
    url : String,
    updatestatus : String//this mean that this product is updatetd or no 
});

module.exports = mongoose.model('Product', productScheme);