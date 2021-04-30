

# Installation
```
npm install ticketengine-checkout-sdk
```


# Setup
Create an new instance of the cart.
```js
const options = {};
const cart = new Cart(options);
```

## Cart options
Option | Description
:--- | :---
salesChannelId* | Uuid of the sales channel
registerId* | Uuid of the register
customerId | Uuid of the customer
preferredLanguageCode | ISO 639-1 language code
clientId | Oauth client id
clientSecret | Oauth client secret
scope | Oauth requested scopes
authUrl | Url of the auth api, production url is default
adminApiUrl | Url of the admin api, production url is default 
graphApiUrl | Url of the graph api, production url is default
* Required options

# Usage

## Methods

### login
```cart.login(username, password)```

### isTokenExpired
```cart.isTokenExpired()```
Returns true if oauth token is expired

### getEvent
```cart.getEvent(eventId)```

#### Returns
```json
{
    "id": "dfe2243c-a2b6-11eb-bac0-0242ac12001c",
    "eventManagerId": "de567e74-a2b6-11eb-b2ec-0242ac12001c",
    "name": "My event",
    "description": "Lorum ipsum",
    "location": "Some place",
    "start": "2025-08-06T18:00:00+00:00",
    "end": "2025-08-06T20:00:00+00:00",
    "totalCapacity": 220,
    "availableCapacity": 201
}
```

### getEventPrices
```cart.getEventPrices(eventId, customerId, salesChannelId, preferredLanguageCode)```

#### Parameters
Parameter | Description
:--- | :---
eventId* | Uuid of the event
customerId | Uuid of the customer
salesChannelId | Uuid of the sales channel
preferredLanguageCode | ISO 639-1 language code

#### Returns
Array of event prices
```json
[
    {
        "conditionId": "e2d4283e-a2b6-11eb-ab10-0242ac12001c",
        "price": 10,
        "currency": {
            "code": "EUR",
            "name": "Euro",
            "exponent": 2,
            "symbol": "€"
        },
        "tax": 0.57,
        "description": "Regular",
        "conditionPath": ["e2d87074-a2b6-11eb-a5fc-0242ac12001c", "e2d77282-a2b6-11eb-a91d-0242ac12001c", "e2d4283e-a2b6-11eb-ab10-0242ac12001c"],
        "limit": null,
        "accessDefinition": {
            "id": "e2b2cf68-a2b6-11eb-b369-0242ac12001c",
            "name": "Regular access",
            "description": null,
            "capacityLocations": ["root.regular"]
        }
    }
]
```

### getProductDefinition
```cart.getProductDefinition(productDefinitionId)```

#### Returns
```json
{
    "id": "f5088f54-a2b6-11eb-a791-0242ac12001b",
    "name": "My product",
    "description": "Lorum ipsum"
}
```

### getProductPrices
```cart.getProductPrices(productDefinitionId, customerId, salesChannelId, preferredLanguageCode)```

#### Parameters
Parameter | Description
:--- | :---
productDefinitionId* | Uuid of the product definition
customerId | Uuid of the customer
salesChannelId | Uuid of the sales channel
preferredLanguageCode | ISO 639-1 language code

#### Returns
```json
{
    "conditionId": "f51bcc04-a2b6-11eb-b9e3-0242ac12001b",
    "price": 50.0,
    "currency": {
        "code": "EUR",
        "name": "Euro",
        "exponent": 2,
        "symbol": "€"
    },
    "tax": 0.0,
    "description": "",
    "conditionPath": ["f522991c-a2b6-11eb-a688-0242ac12001b", "f520f580-a2b6-11eb-b358-0242ac12001b", "f51bcc04-a2b6-11eb-b9e3-0242ac12001b"],
    "limit": null,
    "productDefinition": {
        "id": "f5088f54-a2b6-11eb-a791-0242ac12001b",
        "name": "My product",
        "description": "Lorum ipsum"
    }
}
```

### getCustomer
```cart.getCustomer(customerId)```

#### Returns
```json
{
    "id": "db20cd40-a2b6-11eb-a0f0-0242ac12001a",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "sortName": "Doe, John",
    "birthDate": null,
    "email": null,
    "gender": "male",
    "tags": null
}
```

### getOrder
```cart.getOrder(orderId, validator, retryPolicy, forceReload)```

#### Parameters
Parameter | Description
:--- | :---
orderId* | Uuid of the order
validator | Instance of class that implements the OrderValidator interface. See order validators.
retryPolicy | Array of values in milliseconds to wait until retry. Continue retry until validator returns true. Value is shifted from array and then wait value amount of milliseconds before next try.
forceReload | If set to true force to call the api and not get cached order from localstorage.

#### Returns
```json
{
    "id": "0580948e-a2b8-11eb-ba91-0242ac12001d",
    "status": "completed",
    "number": "2105D12C2433",
    "email": null,
    "customer": {
        "id": "25f74082-a2b8-11eb-b81b-0242ac12001a",
        "fullName": null
    },
    "paymentStatus": "paid",
    "paymentUrl": null,
    "payments": [],
    "totalPrice": 0,
    "totalTax": 0,
    "createDate": "2021-04-21T15:41:21+00:00",
    "expiresOn": null,
    "tokens": [],
    "requiredPayments": [],
    "requiredLoyaltyCardPayments": [],
    "lineItems": [
        {
            "id": "db416b0c-a2b8-11eb-98a2-0242ac12001d",
            "type": "access",
            "status": "completed",
            "price": 0,
            "tax": 0,
            "currency": {
                "code": "EUR",
                "name": "Euro",
                "exponent": 2,
                "symbol": "€"
            },
            "limit": 1,
            "name": "Regular",
            "capacityLocationPath": "venue-1.floor",
            "requestedConditionPath": ["348b0d32-a2b7-11eb-806b-0242ac12001c", "348b090e-a2b7-11eb-82b3-0242ac12001c", "348b0170-a2b7-11eb-ac8f-0242ac12001c"],
            "accessId": "dc703436-a2b8-11eb-aa4a-0242ac12001c",
            "event": {
                "id": "dfe2243c-a2b6-11eb-bac0-0242ac12001c",
                "eventManagerId": "de567e74-a2b6-11eb-b2ec-0242ac12001c",
                "name": "My event",
                "location": null,
                "start": "2025-08-06T18:00:00+00:00",
                "end": "2025-08-06T20:00:00+00:00",
                "availableCapacity": 201
            }
        }
    ]
}
```

### createOrder
```cart.createOrder()```
Create a new empty order.

### getOrderId
```cart.getOrderId()```
Returns order id from cache order in localstorage.

### cancelOrder
```cart.cancelOrder(orderId)```
Cancel order. If no orderId is supplied cancel order cached in localstorage.

### cancelReservation
```cart.cancelReservation(orderId)```
Cancel reserved order. If no orderId is supplied cancel order cached in localstorage.

### addItems
```cart.addItems(items)```

#### Parameters
```json
[
  {
    eventManagerId: 'de567e74-a2b6-11eb-b2ec-0242ac12001c',
    eventId: 'dfe2243c-a2b6-11eb-bac0-0242ac12001c',
    accessDefinitionId: 'e2b2cf68-a2b6-11eb-b369-0242ac12001c',
    requestedConditionPath: ["348b0d32-a2b7-11eb-806b-0242ac12001c", "348b090e-a2b7-11eb-82b3-0242ac12001c", "348b0170-a2b7-11eb-ac8f-0242ac12001c"]
  },
  {
    productDefinitionId: 'f5088f54-a2b6-11eb-a791-0242ac12001b',
    requestedConditionPath: ["348b0d32-a2b7-11eb-806b-0242ac12001c", "348b090e-a2b7-11eb-82b3-0242ac12001c", "348b0170-a2b7-11eb-ac8f-0242ac12001c"]
  }
]
```

### removeItems
```cart.removeItems(items)```

#### Parameters
```json
[
  {
    orderLineItemId: 'ac088f54-a2b6-11eb-a791-0242ac12001b'
  }
]
```

### changeItems
```cart.changeItems(addItems, removeItems)```

#### Parameters
Parameter | Description
:--- | :---
addItems | see cart.addItems
removeItems | see cart.removeItems

### getItemCount
```cart.getItemCount()```
Returns the number of items in cart

### addToken
```cart.addToken(token)```
Add a coupon code to cached order in localstorage.

#### Parameters
Parameter | Description
:--- | :---
token | Coupon code

### clearOrder
```cart.clearOrder()```
Removes cached order from localstorage, does not cancel order.



## Order validators
Order validators implement the OrderValidator interface. The validate method returns true if the order is valid.
```typescript
export interface OrderValidator {
    validate(order: Order): Boolean;
}
```

### List validators
- IsCompleted
- IsTimeout
- IsCanceled
- IsPending
- IsCheckedOut
- IsReserved
- IsPaid
- IsEmpty
- IsInFinalState
- IsProcessingPayment
- HasCustomer
- HasToken(token: string)
- HasStatus(status: OrderStatus[])
- HasPaymentWithCurrencyCode(currencyCodes: string[])
- HasItemsWithStatus(status: LineItemStatus[])
- ItemsHaveStatus(orderLineIds: string[], status: LineItemStatus)
- NeedsPaymentWithCurrency(currencyCode: string)
- NeedsPaymentWithIsoCurrency
- NeedsPaymentWithCustomCurrency
- NeedsLoyaltyCardPayment
- CanReserve
- CanCheckout
- CanPay
- CanPayOnline
- ValidateItemsStatus(reservedOrderLineIds: string[], removedOrderLineIds: string[], completedOrderLineIds: string[])


