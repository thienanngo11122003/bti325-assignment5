/*********************************************************************************
*  BTI325 – Assignment 05
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part 
*  of this assignment has been copied manually or electronically from any other source 
*  (including 3rd party web sites) or distributed to other students.
* 
*  Name: ____Austin Ngo__________________ Student ID: _128725223_____________ Date: ______17/11/2023__________
*
*  Online (Cyclic) Link: https://calm-sun-hat-hen.cyclic.app
*
********************************************************************************/ 


const express = require('express');
const path = require("path");
const app = express();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const blog_service = require("./blog-service");
const upload = multer();
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');

// set port
const HTTP_PORT = process.env.PORT || 8080;

cloudinary.config({
    cloud_name: 'dgv3isq6f',
    api_key: '579187953213367',
    api_secret: '-umWDL51BLC7ipaDYQwiXFKiZXA',
    secure: true
});

// middleware
app.use(express.static("public"));
app.use(upload.single("featureImage"));
app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    app.locals.viewingCategory = req.query.category;
    next();
});

app.use(express.urlencoded({extended: true}));


// add handlebars engines and helpers
app.engine('.hbs', exphbs.engine({
    extname:'.hbs', 
    helpers: {
        navLink: function(url, options) {
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(context){
            return stripJs(context);
        },
        formatDate: function(dateObj){
            let year = dateObj.getFullYear();
            let month = (dateObj.getMonth() + 1).toString();
            let day = dateObj.getDate().toString();
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
        }
    }}));
app.set('view engine', 'hbs');

// app routes
app.get('/', (req, res) => {
    res.redirect("/blog")
});
app.get('/about', (req, res) => {
    res.render('about');
})
app.get('/blog', async (req, res) => {
    let viewData = {};

    try{

        let posts = [];

        if(req.query.category){
            posts = await blog_service.getPublishedPostsByCategory(req.query.category);
        }else{
            posts = await blog_service.getPublishedPosts();
        }

        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        let post = posts[0]; 

        viewData.posts = posts;
        viewData.post = post;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        let categories = await blog_service.getCategories();

        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    res.render("blog", {data: viewData})

});
app.get('/blog/:id', async (req, res) => {

    let viewData = {};

    try{

        let posts = [];

        if(req.query.category){
            posts = await blog_service.getPublishedPostsByCategory(req.query.category);
        }else{
            posts = await blog_service.getPublishedPosts();
        }

        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        viewData.posts = posts;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        viewData.post = await blog_service.getPostById(req.params.id);
    }catch(err){
        viewData.message = "no results"; 
    }

    try{
        let categories = await blog_service.getCategories();

        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    res.render("blog", {data: viewData})
});
app.get('/posts', (req, res) => {
    const category = req.query.category;
    const minDate = req.query.minDate;
    if (category) {
        blog_service.getPostsByCategory(Number(category)).then((data) => res.render("posts", {posts: data}))
        .catch((err) => res.render("posts", {message: err}));
    }
    else if (minDate) {
        blog_service.getPostsByMinDate(minDate).then((data) => res.render("posts", {posts: data}))
        .catch((err) => res.render("posts", {message: err}));
    }
    else {
        blog_service.getAllPosts().then((data) => {
        if (data.length > 0)
        {
            res.render("posts", {posts: data});
        } else 
        {
            res.render("posts", { message: "no results" });
        }
        })
        .catch((err) => res.render("posts", {message: err}));
    }
})
app.get('/posts/add', (req, res) => {
    blog_service.getCategories().then(data => {
        res.render('addPost', {categories: data});
    }).catch(err => {
        res.render('addPost',{categories: []});
    })
})
app.post('/posts/add', (req, res) => {
    let streamUpload = (req) => {
        return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
                (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
                }
            );
    
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
    };
    async function upload(req) {
        let result = await streamUpload(req);
        return result;
    }
    upload(req).then((uploaded)=>{
        req.body.featureImage = uploaded.url;
        blog_service.addPost(req.body)
        .then(() => {
            console.log("New post added");
            res.redirect('/posts')}); // redirect to posts
})})
app.get('/posts/:value', (req, res) => {
    blog_service.getPostById(Number(req.params.value)).then((data) => res.send(data))
    .catch((err) => {return {message: err}});
})
app.get('/categories', (req, res) => {
    blog_service.getCategories().then((data) => 
    {
        if (data.length > 0) 
        {
            res.render('categories', {categories:data});
        } else 
        {
            res.render('categories', {message: "no results"});
        }
    })
    .catch((err) => res.render('categories', {message:err}));
})

// start server if initialize is successful
try{
    blog_service.initialize().then(() => {
        app.listen(HTTP_PORT, () => { console.log(`Express http server listening on port ${HTTP_PORT}`) });
    })
}
catch {
    throw new Error("Could not initialize data set");
}

app.get('/categories/add', (req, res) => {
    res.render('addCategory');
});

app.post('/categories/add', (req,res) => {
    blog_service.addCategory(req.body).then(() => res.redirect('/categories'))
});

app.get('/categories/delete/:id', (req,res) => {
    blog_service.deleteCategoryById(req.params.id)
        .then(() => res.redirect('/categories'))
        .catch(() => res.status(500).send("Unable to Remove Category / Category not found"))
});

app.get('/posts/delete/:id', (req, res) => {
    blog_service.deletePostById(req.params.id)
        .then(() => res.redirect('/posts'))
        .catch(() => res.status(500).send("Unable to Remove Category / Category not found"))
})