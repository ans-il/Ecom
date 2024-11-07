const db = require("../config/connection");
const collection = require('../config/collections');
const bcrypt = require('bcrypt');
const ObjectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay')
const razorpay = new Razorpay({ key_id: 'rzp_test_IrK5WRmtdBxZB7', key_secret: 'HBGxqPNI7SbY7WQw0wmya0wT' })


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (res, rej) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then(data => {
                db.get().collection(collection.USER_COLLECTION).findOne({ _id: data.insertedId }).then(result => {
                    res(result)
                })

            })
        })

    },

    doLogin: (userData) => {
        return new Promise(async (res, rej) => {
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then(status => {
                    if (status) {
                        console.log('login success');
                        response.user = user;
                        response.status = true;
                        res(response)
                    } else {
                        console.log('incorrect password');
                        res({ status: false })
                    }
                })
            } else {
                console.log('incorrect email');
                res({ status: false })
            }
        })
    },

    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(String(proId)),
            quantity: 1
        }
        return new Promise(async (res, rej) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION)
                .findOne({ user: new ObjectId(String(userId)) })
            if (!userCart) {
                let cartObj = {
                    user: new ObjectId(String(userId)),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION)
                    .insertOne(cartObj).then(response => {
                        res()
                    })
            } else {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(String(userId)), 'products.item': new ObjectId(String(proId)) }, {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(response => res())
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(String(userId)) }, {
                            $push: { products: proObj }
                        }).then(response => res())
                }
            }

        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (res, rej) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: new ObjectId(String(userId)) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }

                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    }
                ]).toArray()

            res(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (res, rej) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(String(userId)) })
            if (cart) {
                count = cart.products.length
            }
            res(count)
        })

    },
    changeProductQty: (data) => {
        const cartId = data.cart
        const proId = data.product
        const count = parseInt(data.count)
        const quantity = parseInt(data.quantity)

        return new Promise(async (res, rej) => {

            if (count == -1 && quantity == 1) {
                let product = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .findOne({ _id: new ObjectId(String(proId)) })

                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(String(cartId)) }, {
                        $pull: { products: { item: new ObjectId(String(proId)) } }
                    }).then(response => {
                        res({ removeProduct: true, product })
                    })

            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(String(cartId)), 'products.item': new ObjectId(String(proId)) }, {
                        $inc: { 'products.$.quantity': count }
                    }).then(response => {
                        res({ status: true })
                    })
            }

        })

    },

    removeProduct: (data) => {
        const cartId = data.cart
        const proId = data.product
        return new Promise(async (res, rej) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION)
                .findOne({ _id: new ObjectId(String(proId)) })

            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: new ObjectId(String(cartId)) }, {
                    $pull: { products: { item: new ObjectId(String(proId)) } }
                }).then(response => {
                    res({ status: true, product })
                })
        })
    },

    getTotalAmt: (userId) => {
        return new Promise(async (res, rej) => {
            let total = await db.get().collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: new ObjectId(String(userId)) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }

                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, price: { $toDouble: '$product.price' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ['$quantity', '$price'] } }
                        }
                    }
                ]).toArray()

            res(total[0].total)
        })
    },


    getCartProList: (userId) => {
        return new Promise(async (res, rej) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(String(userId)) })
            res(cart.products)
        })
    },


    placeOrder: (order, products, total) => {
        return new Promise((res, rej) => {
            let status = order.paymethod === 'cod' ? 'placed' : 'pending'
            let orderObj = {
                date: new Date().toDateString(),
                userId: new ObjectId(String(order.userId)),
                deliveryDetails: {
                    address: order.address,
                    pincode: order.pincode,
                    mobile: order.mobile,

                },
                products: products,
                payMethod: order.paymethod,
                totalAmt: total,
                status: status
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then(response => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(String(order.userId)) })
                res(response.insertedId)
            })
        })

    },


    getUserOrders: (userId) => {
        return new Promise((res, rej) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: new ObjectId(String(userId)) }).toArray().then(response => {
                    res(response)
                })
        })
    },

    getOrderProducts: (orderId) => {
        return new Promise(async (res, rej) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new ObjectId(String(orderId)) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            res(orderItems)
        })

    },

    generateRazorpay: (orderId, total) => {
        return new Promise((res, rej) => {
            razorpay.orders.create({
                amount: total * 100,
                currency: "INR",
                receipt: orderId,

            }).then(order => {
                res(order)
            }).catch(error => {
                console.error("Error creating order:", error);
                res.status(500).send("Error creating order");
            });
        })

    },

    verifyPayment: (details) => {
        return new Promise((res, rej) => {
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'HBGxqPNI7SbY7WQw0wmya0wT')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                res()
            } else {
                rej()
            }
        })
    },

    changePaymentStatus: (orderId) => {
        return new Promise((res, rej) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: new ObjectId(String(orderId)) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }).then(() => {
                        res()
                    })

        })
    }

}
