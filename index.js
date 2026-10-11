const ADMIN_USERNAME = "admin"
const ADMIN_PASSWROD = "1234"

const path = require('path');
const fs = require('fs');

const express = require('express')
const app = express()
const port = 3000

const mongoose = require('mongoose');
const multer = require('multer')
const nodemailer = require('nodemailer')
const session = require('express-session')

async function main() {
    await mongoose.connect('mongodb://preeti:w29RAXRxdjzYm5XS@ac-gi4ztd9-shard-00-00.n9dlgb2.mongodb.net:27017,ac-gi4ztd9-shard-00-01.n9dlgb2.mongodb.net:27017,ac-gi4ztd9-shard-00-02.n9dlgb2.mongodb.net:27017/?ssl=true&replicaSet=atlas-kk4lrz-shard-0&authSource=admin&appName=Cluster0')
}

main()
.then(()=>{console.log("DB Connected")})
.catch((err)=>{console.log(err)})

const bookschema = new mongoose.Schema({
    title:String,
    author:String,
    price:Number,
    category:String,
    img:String
})

const Book = mongoose.model("Book",bookschema)
app.set('view engine','ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended : true}))

app.use(session({
    secret: 'bookstore-secret',
    resave: false,
    saveUninitialized: true
}))

function isAdmin(req,res,next){
    if(req.session.isAdmin){
        next()
    }else{
        res.send("Access Denied")
    }
}

app.get('/admin/login',(req,res)=>{
    res.render('adminlogin')
})
app.get('/admin/logout',(req,res)=>{
    req.session.destroy()
    res.redirect("/")
})
app.post('/admin/login',(req,res)=>{
    const username = req.body.username
    const password = req.body.password
    if(username==ADMIN_USERNAME && password == ADMIN_PASSWROD){
        req.session.isAdmin=true
        res.redirect('/books')
    }else{
        res.send("Invalid Username or Password")
    }
})


app.post('/admin/login',(req,res)=>{
            req.session.destroy()
            res.redirect('/')
})

app.use((req, res, next) => {
    const cart = req.session.cart || [];
    res.locals.cartCount = cart.reduce(
        (total, book) => total + book.quantity,
        0
    );
    next();
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });
const transport = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user:'preetichablani2006@gmail.com',
        pass:'iudb ecet hzpk bnnb',
    }
})

app.get('/', async (req, res) => {
    const books = await Book.find().sort({ _id: -1 }).limit(2);
    const imageMap = {
        "The Alchemist": "/uploads/1791709402563-.jpg",
        "Wings of Fire": "/uploads/wings.jpg",
        "Panchatantra": "/uploads/pa.jpg",
        "Tenali Raman Stories": "/uploads/1790847338296-TR.jpg",
        "The Jungle Book": "/uploads/jungle.jpg",
        "The Blue Umbrella ": "/uploads/bu.jpg"
    };
    books.forEach(book => {
        if (imageMap[book.title]) {
            book.img = imageMap[book.title];
        }
    });
    res.render('home', { books });
});
app.get('/about',(req,res)=>{
    res.render('about')
})

app.get('/books', async (req, res) => {
    const books = await Book.find();
    const imageMap = {
        "The Alchemist": "/uploads/1791709402563-.jpg",
        "Wings of Fire": "/uploads/wings.jpg",
        "Panchatantra": "/uploads/pa.jpg",
        "Tenali Raman Stories": "/uploads/1790847338296-TR.jpg",
        "The Jungle Book": "/uploads/jungle.jpg",
        "The Blue Umbrella ": "/uploads/bu.jpg"
    };
    books.forEach(book => {
        if (imageMap[book.title]) {
            book.img = imageMap[book.title];
        }
    });
    res.render('books', {
        books,
        isAdmin: req.session.isAdmin
    });
});



app.post('/books', isAdmin, upload.single('img'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Please select a book image.');
        }
        console.log('Uploaded image path:', req.file.path);
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            price: req.body.price,
            category: req.body.category,
            img: '/uploads/' + req.file.filename
        });
        await book.save();
        console.log('Saved image URL:', book.img);
        res.redirect('/books');
    } catch (error) {
        console.error('Book upload error:', error);
        res.status(500).send('Unable to add book. Please try again.');
    }
});

app.post('/books/delete/:id',isAdmin,async(req,res)=>{
    const id = req.params.id
    await Book.findByIdAndDelete(id)
    res.redirect('/books')
})

app.post('/cart/add/:id', async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book) {
        return res.send('Book not found');
    }
    if (!req.session.cart) {
        req.session.cart = [];
    }
    const existingBook = req.session.cart.find(
        item => String(item.id) === String(book._id)
    );
    if (existingBook) {

        existingBook.quantity += 1;
    } else {
        req.session.cart.push({
            id: book._id,
            title: book.title,
            author: book.author,
            price: book.price,
            img: book.img,
            quantity: 1
        });
    }
    res.redirect('/cart');
})
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart });
});

app.get('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    res.render('checkout', { cart });

});

app.post('/cart/increase/:id', (req, res) => {
    const book = req.session.cart.find(
        item => String(item.id) === String(req.params.id)
    );
    if (book) {
        book.quantity += 1;
    }
    res.json({
        quantity: book ? book.quantity : 0
    });
});

app.post('/cart/decrease/:id', (req, res) => {
    const bookIndex = req.session.cart.findIndex(
        item => String(item.id) === String(req.params.id)
    );
    if (bookIndex !== -1) {
        req.session.cart[bookIndex].quantity -= 1;
        if (req.session.cart[bookIndex].quantity <= 0) {
            req.session.cart.splice(bookIndex, 1);
        }
    }
    const remainingBook = req.session.cart.find(
        item => String(item.id) === String(req.params.id)
    );
    res.json({
        quantity: remainingBook ? remainingBook.quantity : 0
    });
});
app.get('/books/edit/:id',isAdmin,async(req,res)=>{
    const id = req.params.id
    const books = await Book.findById(id)
    res.render('editbook',{ books })
})

app.post('/books/edit/:id', upload.single('img'), async(req,res)=>{
    const id = req.params.id
    const books = await Book.findById(id)
    books.title = req.body.title
    books.author = req.body.author
    books.price = req.body.price
    books.category = req.body.category
    if(req.file){
        books.img = '/uploads/' + req.file.filename
    }
    await books.save()
    res.redirect('/books')
})

app.get('/category', async (req, res) => {
    const books = await Book.find();
    const imageMap = {
        "The Alchemist": "/uploads/1791709402563-.jpg",
        "Wings of Fire": "/uploads/wings.jpg",
        "Panchatantra": "/uploads/pa.jpg",
        "Tenali Raman Stories": "/uploads/1790847338296-TR.jpg",
        "The Jungle Book": "/uploads/jungle.jpg",
        "The Blue Umbrella ": "/uploads/bu.jpg"
    };
    books.forEach(book => {
        if (imageMap[book.title]) {
            book.img = imageMap[book.title];
        }
    });
    const categories = [...new Set(
        books.map(book => book.category.trim())
    )];
    res.render('categories', { books, categories });
});
app.get('/category/:category', async (req, res) => {
    const category = req.params.category;
    const allBooks = await Book.find();
    const imageMap = {
        "The Alchemist": "/uploads/1791709402563-.jpg",
        "Wings of Fire": "/uploads/wings.jpg",
        "Panchatantra": "/uploads/pa.jpg",
        "Tenali Raman Stories": "/uploads/1790847338296-TR.jpg",
        "The Jungle Book": "/uploads/jungle.jpg",
        "The Blue Umbrella ": "/uploads/bu.jpg"
    };
    allBooks.forEach(book => {
        if (imageMap[book.title]) {
            book.img = imageMap[book.title];
        }
    });
    const books = allBooks.filter(book =>
        book.category.trim() === category.trim()
    );
    const categories = [...new Set(
        allBooks.map(book => book.category.trim())
    )];
    res.render('categories', { books, categories });
});
app.get('/contact',(req,res)=>{  
    res.render('contact')
})
app.post('/contact', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const mob = req.body.mob;
    const message = req.body.message;

    transport.sendMail({
        to: 'preetichablani2006@gmail.com',
        subject: 'New Customer Message',
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${mob}\nMessage: ${message}`
    }, (error, info) => {

        if (error) {
            console.log(error);
            return res.send(`
                <script>
                    alert("Email not sent!");
                    window.location.href = "/contact";
                </script>
            `);
        }
        res.send(`
            <script>
                alert("Message Sent Successfully!");
                window.location.href = "/contact";
            </script>
        `);
    });
});

app.post('/place-order', (req, res) => {
    const payment = req.body.payment;
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.redirect('/cart');
    }
    const total = cart.reduce((sum, book) => {
        return sum + (book.price * book.quantity);
    }, 0);
    req.session.cart = [];
    res.render('order-success', {
        payment,
        total
    });
});

app.listen(port,()=>{
    console.log("Listening on "+port)
})