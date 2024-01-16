const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');//library used for web scrapping this library help us to retrieve the data from the website from amazon and it's used to handle the websites 
const cheerio = require('cheerio');//Cheerio simplifies the process of extracting data from HTML documents. It allows you to use jQuery-

//requiring product model
let Product = require('../models/product');

// Checks if user is authenticated
function isAuthenticatedUser(req, res, next) {
    if (req.isAuthenticated()) {
        return next();//next herepass the control to te next middlewear in the stack 
    }
    req.flash('error_msg', 'Please Login first to access this page.')
    res.redirect('/login');
}

let browser;
//async it doesn't wait for the function to complete it run the next line of the code and let the function loaad in the background 
//sync it wait and block the other lnes of the code untill this fnction is loaded 
//asynchronized //synchronized 
// await is function or method used with aync just to hold or wait for a specific acction to be loaded 
//Scrape Function
async function scrapeData(url, page) {//this function take two variables  the url that we wanna scrape and also the name of the page 
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 0 });//this used with the async method to wait the page to load 
        //this page.go is from puppeter library and we asign it with await to let the function load the page , and timeout is the time that if the function doesn't work this will break it and here timeout 0 it means that the code should still waiting for the page to load there is no limit of time 
        const html = await page.evaluate(() => document.body.innerHTML);//here we get the html page of the website 
        const $ = await cheerio.load(html);//we use the library cheerio that is used to handle the html of the website and we assigne it to the amazon page 

        let title = $('span#productTitle').text();//the query to get the name or the title 
        let priceWhole = $('span.a-price-whole').text();
        let priceFraction = $('span.a-price-fraction').text();
        //the query to get the price 
        // Combine the whole and fraction parts of the price
        let priceString = priceWhole + (priceFraction ? '.' + priceFraction : '');

        // Parse the price string as a floating-point number
        let price = parseFloat(priceString);

        let seller = '';//here the initial value is empty 
        let checkSeller = $('span.a-size-small.offer-display-feature-text-message');//here we see if the seller that is amazon exict 
        if (checkSeller) {
            seller = checkSeller.text();//if the seller exict then w e paste the value of the seller into the variable 
        }

        let outOfStock = '';
        let checkOutOfStock = $('span.a-size-medium');
        if (checkOutOfStock) {
            outOfStock = checkOutOfStock.text();
        }

        let stock = '';

        if (!(seller.includes('Amazon')) || outOfStock.includes('Out of Stock')) {
            stock = 'Out of stock';
        } else {
            stock = 'In stock';
        }

        return {
            title,
            price,
            stock,
            url
        }

    } catch (error) {
        console.log(error);
    }
}

//GET routes starts here

router.get('/', (req, res) => {
    res.render('./admin/index');
});

router.get('/dashboard', isAuthenticatedUser, (req, res) => {

    Product.find({})
        .then(products => {
            res.render('./admin/dashboard', { products: products });
        });

});


router.get('/product/new', isAuthenticatedUser, async (req, res) => {
    try {
        // Extract the search URL from the query parameter
        let url = req.query.search;//hone mne5od l query men l ejs file l form taba3 l ejs 

        // Check if a search URL is provided
        if (url) {
            // Launch a new Puppeteer browser instance
            browser = await puppeteer.launch({ args: ['--no-sandbox'] });

            // Open a new page in the browser
            const page = await browser.newPage();

            // Scrape data from the provided URL using the scrapeData function
            let result = await scrapeData(url, page);

            // Prepare the product data to be rendered in the 'newproduct' view
            let productData = {
                title: result.title,
                price: '$' + result.price,
                stock: result.stock,
                productUrl: result.url
            };

            // Render the 'newproduct' view with the product data
            res.render('./admin/newproduct', { productData: productData });//we use productdata just to parse the data 

            // Close the Puppeteer browser instance
            browser.close();//after scrapping we close the window 
        } else {
            // If no search URL is provided, initialize an empty productData object
            let productData = {
                title: "",
                price: "",
                stock: "",
                productUrl: ""
            };//we put it empty so  in the worst case when no internet or something like that we don't get an error 

            // Render the 'newproduct' view with the empty product data
            res.render('./admin/newproduct', { productData: productData });
        }
    } catch (error) {
        // If an error occurs during the process, redirect to '/product/new' with an error message
        req.flash('error_msg', 'ERROR: ' + error);
        res.redirect('/product/new');
    }
});


router.get('/product/search', isAuthenticatedUser, (req, res) => {
    let userSku = req.query.sku;
    if (userSku) {
        Product.findOne({ sku: userSku })
            .then(product => {
                if (!product) {
                    req.flash('error_msg', 'Product does not exist in the database.');
                    return res.redirect('/product/search');
                }

                res.render('./admin/search', { productData: product });//if the res is true so the info of the item appear on the screeen 
            })
            .catch(err => {
                req.flash('error_msg', 'ERROR: ' + err);
                res.redirect('/product/new');
            });
    } else {
        res.render('./admin/search', { productData: '' });//if there is no userSku
    }
});

router.get('/products/instock', isAuthenticatedUser, (req, res) => {
    Product.find({ newstock: "In stock" })//this the mongo db query to find the instock product 
        .then(products => {
            res.render('./admin/instock', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});//hone men bayen kel l l product data li hene instock wel ejs l mas2oule 3anna hiye instock.ejs 

router.get('/products/outofstock', isAuthenticatedUser, (req, res) => {
    Product.find({ newstock: "Out of stock" })
        .then(products => {
            res.render('./admin/outofstock', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});

router.get('/products/pricechanged', isAuthenticatedUser, (req, res) => {
    Product.find({})
        .then(products => {
            res.render('./admin/pricechanged', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});

router.get('/products/backinstock', isAuthenticatedUser, (req, res) => {
    Product.find({ $and: [{ oldstock: 'Out of stock' }, { newstock: 'In stock' }] })
        .then(products => {
            res.render('./admin/backinstock', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});

router.get('/products/updated', isAuthenticatedUser, (req, res) => {
    Product.find({ updatestatus: "Updated" })
        .then(products => {
            res.render('./admin/updatedproducts', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});


router.get('/products/notupdated', isAuthenticatedUser, (req, res) => {
    Product.find({ updatestatus: "Not Updated" })
        .then(products => {
            res.render('./admin/notupdatedproducts', { products: products });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});

router.get('/update', isAuthenticatedUser, (req, res) => {
    res.render('./admin/update', { message: '' });
});
//POST routes starts here

router.post('/product/new', isAuthenticatedUser, (req, res) => {
    let { title, price, stock, url, sku } = req.body;//we use .body for the post method 

    let newProduct = {
        title: title,
        newprice: price,
        oldprice: price,
        newstock: stock,
        oldstock: stock,
        sku: sku,
        company: "Amazon",
        url: url,
        updatestatus: "Updated"
    };

    Product.findOne({ sku: sku })
        .then(product => {
            if (product) {
                req.flash('error_msg', 'Product already exist in the database.');
                return res.redirect('/product/new');
            }

            Product.create(newProduct)
                .then(product => {
                    req.flash('success_msg', 'Product added successfully in the database.');
                    res.redirect('/product/new');
                })
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/product/new');
        });
});

router.post('/update', isAuthenticatedUser, async (req, res) => {
    try {
        res.render('./admin/update', { message: 'update started.' });

        Product.find({})
            .then(async products => {
                // we use the first for loop like a tmp temporary just to modify the data into new price and other attribute because in the second one i wanna fetch the data from the web amazon so of curse that the price that it was new it will be the old so this the resain of the first for 
                for (let i = 0; i < products.length; i++) {
                    Product.updateOne({ 'url': products[i].url }, { $set: { 'oldprice': products[i].newprice, 'oldstock': products[i].newstock, 'updatestatus': 'Not Updated' } })
                        .then(products => { })
                }

                browser = await puppeteer.launch({ args: ['--no-sandbox'] });
                const page = await browser.newPage();

                for (let i = 0; i < products.length; i++) {
                    let result = await scrapeData(products[i].url, page);
                    Product.updateOne({ 'url': products[i].url }, { $set: { 'title': result.title, 'newprice': '$' + result.price, 'newstock': result.stock, 'updatestatus': 'Updated' } })
                        .then(products => { })
                }

                browser.close();

            })
            .catch(err => {
                req.flash('error_msg', 'ERROR: ' + err);
                res.redirect('/dashboard');
            });

    } catch (error) {
        req.flash('error_msg', 'ERROR: ' + err);
        res.redirect('/dashboard');
    }
});

//DELETE routes starts here
router.delete('/delete/product/:id', isAuthenticatedUser, (req, res) => {
    let searchQuery = { _id: req.params.id };//right here we assign _id that is usinque in mongodb to the parameter id retrieved from the url

    Product.deleteOne(searchQuery)
        .then(product => {
            req.flash('success_msg', 'Product deleted successfully.');
            res.redirect('/dashboard');
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/dashboard');
        });
});

router.get('*', (req, res) => {
    res.render('./admin/notfound');
});

module.exports = router;