const express = require('express');
const router = express.Router();
const productHelper = require('../helpers/product-helpers');
const userHelper = require('../helpers/user-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.user.loggedIn) next();
  else res.redirect('/login');
}


/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(req.session.user._id)
  }
  productHelper.getAllProducts().then(products => {
    res.render('user/view-products', { title: 'Shopping Cart', products, user, cartCount });
  });
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/user-login', { error: req.session.userLoginErr });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    req.session.userLoginErr = false;
  }
})

router.get('/signup', (req, res) => {
  res.render('user/user-signup')
})

router.post('/signup', (req, res) => {
  userHelper.doSignup(req.body).then(response => {
    req.session.user = response;
    req.session.user.loggedIn = true;
    res.redirect('/');

  })
})

router.post('/login', (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    } else {
      req.session.userLoginErr = "Invalid username or password"
      res.redirect('/login')
    }
  })
})


router.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
})

router.get('/cart', verifyLogin, async (req, res) => {
  cartCount = await userHelper.getCartCount(req.session.user._id)
  let products = await userHelper.getCartProducts(req.session.user._id)
  if (cartCount) {
    let total = await userHelper.getTotalAmt(req.session.user._id)
    res.render('user/cart', { products, user: req.session.user, cartCount, total })
  } else {
    res.render('user/emptycart', { user: req.session.user })
  }
})

router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  userHelper.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})


router.post('/change-product-quantity', (req, res) => {
  userHelper.changeProductQty(req.body).then(async (response) => {
    if (response.quantity >= 1) {
      response.total = await userHelper.getTotalAmt(req.body.user)
    }
    res.json(response)
  })
})

router.post('/remove-product', (req, res) => {
  userHelper.removeProduct(req.body).then((response) => {
    res.json(response)

  })
})

router.get('/place-order', verifyLogin, async (req, res) => {
  let user = req.session.user;
  let total = await userHelper.getTotalAmt(req.session.user._id)
  res.render('user/place-order', { total, user })
})

router.post('/place-order', verifyLogin, async (req, res) => {
  let products = await userHelper.getCartProList(req.body.userId);
  let totalPrice = await userHelper.getTotalAmt(req.body.userId)
  userHelper.placeOrder(req.body, products, totalPrice).then(orderId => {
    if (req.body.paymethod === 'cod') {
      res.json({ codStatus: true });
    } else {
      userHelper.generateRazorpay(orderId, totalPrice).then(response => {
        res.json(response)
      })
    }

  })

})

router.get('/order-success', verifyLogin, (req, res) => {
  res.render('user/order-success', { user: req.session.user })
})


router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelper.getUserOrders(req.session.user._id)
  res.render('user/orders', { user: req.session.user, orders })
})

router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  let products = await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products', { user: req.session.user, products })
})


router.post('/verify-payment', (req, res) => {
  userHelper.verifyPayment(req.body).then(() => {
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch(err => {
    res.json({ status: false })
  })
})

module.exports = router;
