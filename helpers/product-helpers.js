const db = require("../config/connection");
const collection = require('../config/collections');
const { ObjectId } = require('mongodb')
const bcrypt = require('bcrypt');


module.exports = {
    doSignup: (adminData) => {
        return new Promise(async (res, rej) => {
            adminData.password = await bcrypt.hash(adminData.password, 10)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then(data => {
                db.get().collection(collection.ADMIN_COLLECTION).findOne({ _id: data.insertedId }).then(result => {
                    res(result)
                })

            })
        })

    },

    doLogin: (adminData) => {
        return new Promise(async (res, rej) => {
            let loginStatus = false;
            let response = {};
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then(status => {
                    if (status) {                        
                        response.admin = admin;
                        response.status = true;
                        res(response)
                    } else {                        
                        res({ status: false })
                    }
                })
            } else {                
                res({ status: false })
            }
        })
    },


    addProduct: (product, callback) => {
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then(data => {
            callback(data.insertedId)
        })
    },

    getAllProducts: () => {
        return new Promise(async (res, rej) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION)
            .find().toArray()
            res(products)
        })
    },

    getAllOrders: () => {
        return new Promise((res, rej) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .find().toArray().then(orders => {
                    res(orders)
                })
        })
    },

    getAllUsers: () => {
        return new Promise(async (res, rej) => {
            let users = await db.get().collection(collection.USER_COLLECTION)
            .find().toArray()
            res(users)
        })
    },


    deleteProduct: (prodId) => {
        return new Promise((res, rej) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(String(prodId)) }).then(response => {
                console.log(response);
                res(response)
            })
        })
    },
    
    getProductDetails: (prodId) => {
        return new Promise((res,rej) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new ObjectId(String(prodId))}).then((response)=>{
                res(response);
            })  
        })
    },

    updateProduct: (proId, proDetails) => {
        return new Promise((res,rej) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id: new ObjectId(String(proId))},{
                $set:{
                    name: proDetails.name,
                    description: proDetails.description,
                    price: proDetails.price,
                    category: proDetails.category
                }
            }).then(response => {
                res();
            })
        })
    }

}