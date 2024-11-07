const express = require('express');
const router = express.Router();
const productHelper = require('../helpers/product-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.admin) next();
  else res.redirect('/admin/login');
}


/* GET admin page. */

router.get('/', verifyLogin, (req, res) => {
  productHelper.getAllProducts().then(products => {
    res.render('admin/view-products', { products, adminStat: true, admin:req.session.admin });
  })
})

router.get('/login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { error: req.session.adminLoginErr, adminStat: true });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    req.session.adminLoginErr = false;
  }
})


router.get('/signup', (req, res) => {
  res.render('admin/admin-signup', {adminStat:true})
})

router.post('/signup', (req, res) => {
  productHelper.doSignup(req.body).then(response => {
    req.session.admin = response;
    req.session.admin.loggedIn = true;
    res.redirect('/admin');

  })
})

router.post('/login', (req, res) => {
  productHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.admin.loggedIn = true
      res.redirect('/admin')
    } else {
      req.session.adminLoginErr = "Invalid username or password"
      res.redirect('/admin/login')
    }
  })
})


router.get('/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
})


router.get('/all-products',verifyLogin, (req,res) => {
  productHelper.getAllProducts().then(products => {
  res.render('admin/all-products', {adminStat: true, admin:req.session.admin, products})
  })

})

router.get('/all-orders',verifyLogin,async (req,res) => {
  let orders = await productHelper.getAllOrders()
  res.render('admin/all-orders', {adminStat: true, admin:req.session.admin, orders})
})

router.get('/all-users',verifyLogin, async (req,res) => {
  let users = await productHelper.getAllUsers()
  res.render('admin/all-users', {adminStat: true, admin:req.session.admin, users})
})

router.get('/add-product',verifyLogin, (req, res, next) => {
  res.render('admin/add-product', { adminStat: true });

});

router.post('/add-product',verifyLogin, (req, res, next) => {
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) res.render('admin/add-product')
      else console.log(err);

    })
  })
});

router.get('/delete-product/:id', verifyLogin,(req, res) => {
  let prodId = req.params.id;
  productHelper.deleteProduct(prodId).then(() => {
    res.redirect('/admin')
  })

});

router.get('/edit-product/:id',verifyLogin, async (req, res) => {
  let product = await productHelper.getProductDetails(req.params.id)
  res.render('admin/edit-product', { product, adminStat: true })
})

router.post('/edit-product/:id',verifyLogin, (req, res) => {
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + req.params.id + '.jpg')
    }
  })
})

module.exports = router;
