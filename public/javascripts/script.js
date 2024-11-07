const viewImage = (event) => {
    document.getElementById('imgview').src = URL.createObjectURL(event.target.files[0])
}


function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1;
                $('#cart-count').html(count)
                location.reload()
            }else{
                location.href = '/login'
            }
        }
    })
}

function changeQty(cartId, proId, userId, count) {
    let quantity = parseInt(document.getElementById(proId).innerHTML)
    $.ajax({
        url: '/change-product-quantity',
        data: {
            user: userId,
            cart: cartId,
            product: proId,
            count: parseInt(count),
            quantity: quantity
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                alert(response.product.name + " removed from cart")
                location.reload()
            }
            else {
                $('#' + proId).html(quantity + count)
                $('#total').html(response.total);
            }

        }
    })
}

function removeProduct(cartId, proId) {

    $.ajax({
        url: '/remove-product',
        data: {
            cart: cartId,
            product: proId
        },
        method: 'post',
        success: (response) => {
            alert(response.product.name + " removed from cart")
            location.reload()
        }
    })

}

$('#checkout-form').submit(e => {
    e.preventDefault();
    $.ajax({
        url: '/place-order',
        method: 'post',
        data: $('#checkout-form').serialize(),
        success: (response) => {
            console.log(response);
            if (response.codStatus) {
                location.href = '/order-success'
            } else {
                razorpayPayment(response)
            }
        }
    })
})


const razorpayPayment = (order) => {
    let options = {
        "key": "rzp_test_IrK5WRmtdBxZB7",
        "amount": order.amount,
        "currency": "INR",
        "name": "Shopping cart",
        "description": "Test Transaction",
        "image": "https://example.com/your_logo",
        "order_id": order.id,

        "handler": function (response) {                       
            verifyPayment(response, order);
        },
        "prefill": {
            "name": "Anzil",
            "email": "anzil@gmail.com",
            "contact": "0987369369"
        },
        "theme": {
            "color": "#C70000"
        }
    };

    let rzp1 = new Razorpay(options)
    rzp1.open()   
    
}

const verifyPayment = (payment, order) => {
    $.ajax({
        url: '/verify-payment',
        data: { payment, order },
        method: 'post',   
        success: (response) => {
            if(response.status){
                location.href = '/order-success'
            } else {
                alert('payment failed')
            }
        }     
    })
}


