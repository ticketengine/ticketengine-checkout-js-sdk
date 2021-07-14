import {WebClient, CartOperation, CartOperationType} from "ticketengine-sdk";
import {
    GetCustomerResponse,
    GetEventPricesResponse,
    GetEventResponse,
    GetMeResponse, GetOrderMessageResponse,
    GetOrderResponse, GetProductDefinitionResponse, GetProductPricesResponse
} from "./QueryResponse";
import {
    Customer,
    EventPrice,
    LineItemStatus,
    Order,
    OrderMessage,
    OrderStatus,
    ProductDefinition,
    ProductPrice
} from "./Model";
import {
    CanCheckout,
    CanPay,
    CanReserve,
    HasStatus,
    HasToken,
    IsInFinalState,
    IsPending,
    IsReserved,
    ItemsHaveStatus,
    OrderValidator,
    ValidateItemsStatus
} from "./OrderValidator";


export class Cart {

    client: WebClient;
    // salesChannelId: string;
    // registerId: string;
    // customerId?: string;
    // oauthClientId: string;
    // oauthClientSecret: string;
    // oauthScope: string;
    retryPolicy: number[] = [0, 500, 500, 500, 500, 500, 1000, 1000, 1000, 1000, 1000, 3000, 3000, 3000, 5000, 5000];

    // constructor(salesChannelId: string, registerId: string, customerId?: string, clientId?: string, clientSecret?: string, scope?: string, authApiUrl?: string, adminApiUrl?: string, graphApiUrl?: string) {
    constructor(options: CartOptions) {
        this.client = new WebClient({
            authUrl: options.authUrl || 'https://auth.ticketengine.io',
            adminApiUrl: options.adminApiUrl || 'https://admin-api.ticketengine.io',
            graphApiUrl: options.graphApiUrl || 'https://graph-api.ticketengine.io',
            oauthClientId: options.clientId || 'shopping_cart',
            oauthClientSecret: options.clientSecret || '',
            // oauthScope: options.scope || 'order:write payment:write event:read order:read order:reserve',
            oauthScope: options.scope || 'order:write payment:write event:read order:reserve',
            clearTokenOnSetAuthUrl: options.clearTokenOnSetAuthUrl || true,
        });
        // this.salesChannelId = options.salesChannelId;
        // this.registerId = options.registerId;
        // this.customerId = options.customerId;
        // this.oauthClientId = options.clientId || 'shopping_cart';
        // this.oauthClientSecret = options.clientSecret || '';
        // this.oauthScope = options.scope || 'order:write payment:write event:read order:read order:reserve';
        // const clientId =  options.clientId || 'shopping_cart';
        // const clientSecret = options.clientSecret || '';
        // const scope = options.scope || 'order:write payment:write event:read order:read order:reserve';
        // this.client.setClient(clientId, clientSecret);
        // this.client.setScope(scope);
        if(options.salesChannelId) this.setSalesChannelId(options.salesChannelId);
        if(options.registerId) this.setRegisterId(options.registerId);
        if(options.customerId) Cart.setCustomerId(options.customerId);
        if(options.preferredLanguageCode) this.setPreferredLanguageCode(options.preferredLanguageCode);
    }


    public getClient(): WebClient {
        return this.client;
    }


    public async login(username: string, password: string): Promise<void> {
        await this.client.user.getAuthToken({
            grantType: 'password',
            // clientId: this.oauthClientId,
            // clientSecret: this.oauthClientSecret,
            // scope: this.oauthScope,
            clientId: this.client.getClientId(),
            clientSecret: this.client.getClientSecret(),
            scope: this.client.getScope(),
            username: username,
            password: password
        });
    }

    public isTokenExpired(): boolean {
        return this.client.isTokenExpired()
    }

    // public checkToken(): void {
    //     if(this.isTokenExpired()) {
    //
    //     }
    // }



    public async getEvent(eventId: string): Promise<Event> {
        const query = `query { event(id: "${eventId}"){id,eventManagerId,name,description,location,start,end,totalCapacity,availableCapacity,capacityLocationSummery{capacityLocationPath,name,capacity,issued,reserved,granted,available,used,start,end},hasTimeslots} }`;
        const response = await this.client.sendQuery<GetEventResponse>(query);
        return response.data.event;
    }


    public async getEventPrices(eventId: string, customerId: string|null = null, salesChannelId: string|null = null, preferredLanguageCode: string|null = null): Promise<Array<EventPrice>> {
        const inFinalState = new IsInFinalState();
        const orderParam = this.hasOrder() && !inFinalState.validate(await this.getOrder(this.getOrderId())) ? `, orderId: "${this.getOrderId()}"` : '';
        let customerParam = this.hasCustomerId() ? `, customerId: "${this.getCustomerId()}"` : '';
        customerParam = customerParam !== '' && customerId !== null ? `, customerId: "${customerId}"` : '';
        const salesChannelParam = salesChannelId !== null ? `, salesChannelId: "${salesChannelId}"` : '';
        const preferredLanguageParam = preferredLanguageCode !== null ? `, preferredLanguage: "${preferredLanguageCode}"` : '';
        // const query = `query { eventPrices(eventId: "${eventId}"${orderParam}${customerParam}){conditionId,price,currencyCode,limit,tax,description,conditionPath,accessDefinition{id,name,description,capacityLocations}} }`;
        const query = `query { eventPrices(eventId: "${eventId}"${orderParam}${customerParam}${salesChannelParam}${preferredLanguageParam}){conditionId,price,currency{code,name,exponent,symbol},limit,tax,description,conditionPath,accessDefinition{id,name,description,capacityLocations}} }`;
        const response = await this.client.sendQuery<GetEventPricesResponse>(query);
        return response.data.eventPrices;
    }


    public async getProductDefinition(productDefinitionId: string): Promise<ProductDefinition> {
        const query = `query { productDefinition(id: "${productDefinitionId}"){id,name,description,apiConfig{... on CreditAccountApiConfig{source,currencyCode,amount}}} }`;
        const response = await this.client.sendQuery<GetProductDefinitionResponse>(query);
        return response.data.productDefinition;
    }


    public async getProductPrices(productDefinitionId: string, customerId: string|null = null, salesChannelId: string|null = null, preferredLanguageCode: string|null = null): Promise<Array<ProductPrice>> {
        const inFinalState = new IsInFinalState();
        const orderParam = this.hasOrder() && !inFinalState.validate(await this.getOrder(this.getOrderId())) ? `, orderId: "${this.getOrderId()}"` : '';
        let customerParam = this.hasCustomerId() ? `, customerId: "${this.getCustomerId()}"` : '';
        customerParam = customerParam !== '' && customerId !== null ? `, customerId: "${customerId}"` : '';
        const salesChannelParam = salesChannelId !== null ? `, salesChannelId: "${salesChannelId}"` : '';
        const preferredLanguageParam = preferredLanguageCode !== null ? `, preferredLanguage: "${preferredLanguageCode}"` : '';
        const query = `query { productPrices(productDefinitionId: "${productDefinitionId}"${orderParam}${customerParam}${salesChannelParam}${preferredLanguageParam}){conditionId,price,currency{code,name,exponent,symbol},limit,tax,description,conditionPath,productDefinition{id,name,description}} }`;
        const response = await this.client.sendQuery<GetProductPricesResponse>(query);
        return response.data.productPrices;
    }


    public async getCustomer(customerId: string): Promise<Customer> {
        const query = `query { customer(id: "${customerId}"){id,firstName,lastName,fullName,sortName,birthDate,gender,email,tags{id,name}} }`;
        const response = await this.client.sendQuery<GetCustomerResponse>(query, []);
        return response.data.customer;
    }

    public async getOrderMessages(stage: string, orderId: string|null, eventId: string|null, productDefinitionId: string|null, customerId: string|null = null, salesChannelId: string|null = null, preferredLanguageCode: string|null = null): Promise<OrderMessage[]> {
        const orderParam = orderId !== null ? `, orderId: "${orderId}"` : '';
        const eventParam = eventId !== null ? `, eventId: "${eventId}"` : '';
        const productDefinitionParam = productDefinitionId !== null ? `, productDefinitionId: "${productDefinitionId}"` : '';
        const customerParam = customerId !== null ? `, customerId: "${customerId}"` : '';
        const salesChannelParam = salesChannelId !== null ? `, salesChannelId: "${salesChannelId}"` : '';
        const preferredLanguageParam = preferredLanguageCode !== null ? `, preferredLanguage: "${preferredLanguageCode}"` : '';
        const query = `query { orderMessage(stage: "${stage}"${orderParam}${eventParam}${productDefinitionParam}${customerParam}${salesChannelParam}${preferredLanguageParam}){id,message}}`;
        const response = await this.client.sendQuery<GetOrderMessageResponse>(query, []);
        return response.data.orderMessage;
    }


    public async getOrder(orderId: string, validator?: OrderValidator, retryPolicy: Array<number> = [], forceReload: boolean = false): Promise<Order> {
        if(forceReload) {
            await this.fetchOrder(orderId, validator, retryPolicy);
        }

        const order = localStorage.getItem("te-order");
        if(!order) {
            throw new Error('No order found.');
        }
        return JSON.parse(order);
    }


    private async fetchOrder(orderId: string, validator?: OrderValidator, retryPolicy: Array<number> = []): Promise<Order> {
        try {
            // const query = `query { me{order(id: "${orderId}"){id,status,customer{id,fullName},paymentStatus,paymentUrl,payments{id,currencyCode,amount,status},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currencyCode,amount},lineItems{ ... on AccessLineItem {id,type,status,price,tax,currencyCode,limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,event{id,eventManagerId,name,location,start,end,availableCapacity}}}}} }`;
            // const query = `query { me{order(id: "${orderId}"){id,status,customer{id,fullName,email},paymentStatus,paymentUrl,payments{id,currency{code,name,exponent,symbol},amount,status,psp,method},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currency{code,name,exponent,symbol},amount},requiredLoyaltyCardPayments{currency{code,name,exponent,symbol},cardType,amount},lineItems{ ... on AccessLineItem {id,type,status,price,tax,currency{code,name,exponent,symbol},limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,event{id,eventManagerId,name,location,start,end,availableCapacity}} ... on ProductLineItem {id,type,status,name,price,tax,currency{name,code,exponent,symbol},requestedConditionPath,productId,productDefinition{id,name},product{id,status}} }}} }`;
            // const query = `query { me{order(id: "${orderId}"){id,status,number,email,customer{id,fullName,email},paymentStatus,paymentUrl,payments{id,currency{code,name,exponent,symbol},amount,status,psp,method},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currency{code,name,exponent,symbol},amount},requiredLoyaltyCardPayments{currency{code,name,exponent,symbol},cardType,amount},lineItems{ ... on AccessLineItem {id,packageOrderLineItemId,type,status,price,tax,currency{code,name,exponent,symbol},limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,event{id,eventManagerId,name,location,start,end,availableCapacity}} ... on ProductLineItem {id,packageOrderLineItemId,type,status,name,price,tax,currency{name,code,exponent,symbol},requestedConditionPath,productId,productDefinition{id,name},product{id,status}} }}} }`;
            // const query = `query { me{order(id: "${orderId}"){id,status,number,email,customer{id,fullName,email},paymentStatus,paymentUrl,payments{id,currency{code,name,exponent,symbol},amount,status,psp,method},refunds{id,currency{code,name,exponent,symbol},amount,status,refundMethod},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currency{code,name,exponent,symbol},amount},requiredLoyaltyCardPayments{currency{code,name,exponent,symbol},cardType,amount},lineItems{ ... on AccessLineItem {id,packageOrderLineItemId,type,status,price,tax,currency{code,name,exponent,symbol},limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,event{id,eventManagerId,name,location,start,end,availableCapacity}} ... on ProductLineItem {id,packageOrderLineItemId,type,status,name,price,tax,currency{name,code,exponent,symbol},requestedConditionPath,productId,productDefinition{id,name,apiConfig{... on MembershipApiConfig{source}, ... on CreditAccountApiConfig{source}}},product{id,status}} }}} }`;
            // const query = `query { me{order(id: "${orderId}"){id,status,number,email,customer{id,fullName,email},paymentStatus,paymentUrl,payments{id,currency{code,name,exponent,symbol},amount,status,psp,method},refunds{id,currency{code,name,exponent,symbol},amount,status,refundMethod},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currency{code,name,exponent,symbol},amount},requiredLoyaltyCardPayments{currency{code,name,exponent,symbol},cardType,amount},lineItems{ ... on AccessLineItem {id,packageOrderLineItemId,type,status,price,tax,currency{code,name,exponent,symbol},limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,access{id,tokens},event{id,eventManagerId,name,location,start,end,availableCapacity}} ... on ProductLineItem {id,packageOrderLineItemId,type,status,name,price,tax,currency{name,code,exponent,symbol},requestedConditionPath,productId,productDefinition{id,name,apiConfig{... on MembershipApiConfig{source}, ... on CreditAccountApiConfig{source}}},product{id,status}} }}} }`;
            const query = `query { me{order(id: "${orderId}"){id,status,number,email,customer{id,fullName,email},paymentStatus,paymentUrl,payments{id,currency{code,name,exponent,symbol},amount,status,psp,method},refunds{id,currency{code,name,exponent,symbol},amount,status,refundMethod},totalPrice,totalTax,createDate,expiresOn,tokens{id,typeId,token},requiredPayments{currency{code,name,exponent,symbol},amount},requiredLoyaltyCardPayments{currency{code,name,exponent,symbol},cardType,amount},lineItems{ ... on AccessLineItem {id,packageOrderLineItemId,type,status,price,tax,currency{code,name,exponent,symbol},limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,access{id,tokens},event{id,eventManagerId,name,location,start,end,availableCapacity}} ... on ProductLineItem {id,packageOrderLineItemId,type,status,name,price,tax,currency{name,code,exponent,symbol},requestedConditionPath,productId,productDefinition{id,name,apiConfig{... on MembershipApiConfig{source}, ... on CreditAccountApiConfig{source}}},product{id,status}} },aggregatedLineItems{... on AggregatedAccessLineItem {id,type,orderLineItemIds,price,tax,totalPrice,totalTax,currency{name,code,exponent,symbol},limit,quantity,name,requestedConditionPath,accessIds,event{id,eventManagerId,name,start,location,end,availableCapacity},accessDefinition{name}} ... on AggregatedProductLineItem {id,type,orderLineItemIds,price,tax,totalPrice,totalTax,currency{name,code,exponent,symbol},limit,quantity,name,requestedConditionPath,productIds,productDefinition{id,name,apiConfig{... on MembershipApiConfig{source}, ... on CreditAccountApiConfig{source}}}}}}} }`;
            const response = await this.client.sendQuery<GetMeResponse>(query, []);
            const order = response.data.me.order;
            Cart.setOrder(order);

            // check if order is in desired state
            // if not in desired state, retry query
            if(validator && !validator.validate(order)) {
                const sleepTime = retryPolicy.shift();
                if(sleepTime === undefined) throw new Error('Retry attempts exceeded.'); // abort retry, retries attempts exceeded
                await this.sleep(sleepTime); // wait x milliseconds
                return await this.fetchOrder(orderId, validator, retryPolicy) // retry
            }

            return order;
        } catch (error) {
            const sleepTime = retryPolicy.shift();
            if(sleepTime === undefined) throw error; // abort retry, retries attempts exceeded
            await this.sleep(sleepTime); // wait x milliseconds
            return await this.fetchOrder(orderId, validator, retryPolicy) // retry
        }
    }


    public async createOrder(): Promise<void> {
        const isPending = new IsPending();
        const customerId = this.hasCustomerId() ? this.getCustomerId() : undefined;
        const preferredLanguageCode = this.hasPreferredLanguageCode() ? this.getPreferredLanguageCode() : undefined;
        localStorage.removeItem("te-order");
        const response = await this.client.order.createOrder({salesChannelId: this.getSalesChannelId(), registerId: this.getRegisterId(), customerId, preferredLanguageCode}, [0, 1000, 1000, 1000, 3000, 5000]);
        await this.fetchOrder(response.data.orderId, isPending, this.retryPolicy)
    }


    public async cancelOrder(orderId?: string, reason?: string): Promise<void> {
        if(!orderId) {
            orderId = this.getOrderId()
        }
        await this.client.order.cancelOrder({aggregateId: orderId, reason: reason}, this.retryPolicy);
        if(this.hasOrder() && this.getOrderId() === orderId) {
            localStorage.removeItem("te-order");
        }
    }


    public async cancelReservation(orderId?: string, reason?: string): Promise<void> {
        if(!orderId) {
            orderId = this.getOrderId()
        }
        await this.client.order.cancelOrderReservation({aggregateId: orderId, reason: reason}, this.retryPolicy);
        if(this.hasOrder() && this.getOrderId() === orderId) {
            localStorage.removeItem("te-order");
        }
    }


    public async addItems(items: Array<AddItem>): Promise<void> {
        const isInFinalState = new IsInFinalState();

        if(!this.hasOrder() || (this.hasOrder() && isInFinalState.validate(await this.getOrder(this.getOrderId())) )) {
            await this.createOrder();
        }

        // const orderLineIds = await Promise.all(items.map(item => {
        //     return this.addItem(item);
        // }));
        const response = await this.client.order.cartBatchOperation({
            aggregateId: this.getOrderId(),
            operations: this.mapToCartOperations(items)
        }, this.retryPolicy);

        const validator = new ItemsHaveStatus(response.data.orderLineItemIds, LineItemStatus.reserved);
        await this.fetchOrder(this.getOrderId(), validator, this.retryPolicy);
    }


    // private async addItem(item: AddItem): Promise<string> {
    //     let orderLineId = undefined;
    //
    //     if(Cart.isAccessCartItem(item)) {
    //         const response = await this.client.order.addAccessToCart({
    //             aggregateId: this.getOrderId(),
    //             eventManagerId: item.eventManagerId,
    //             eventId: item.eventId,
    //             accessDefinitionId: item.accessDefinitionId,
    //             // capacityLocationPath: cartItem.capacityLocationPath,
    //             requestedConditionPath: item.requestedConditionPath,
    //         }, this.retryPolicy);
    //         orderLineId = response.data.orderLineItemId;
    //     // } else if(Cart.isProductCartItem(item)) {
    //     } else {
    //         throw new Error('Cannot add item. Unknown item type.');
    //     }
    //
    //     return orderLineId;
    // }


    public async removeItems(items: Array<RemoveItem>): Promise<void> {
        // await Promise.all(items.map(item => {
        //     return this.removeItem(item);
        // }));
        await this.client.order.cartBatchOperation({
            aggregateId: this.getOrderId(),
            operations: this.mapToCartOperations([], items)
        }, this.retryPolicy);

        const validator = new ItemsHaveStatus(items.map(i => i.orderLineItemId), LineItemStatus.removed);
        await this.fetchOrder(this.getOrderId(), validator, this.retryPolicy);
    }


    // private async removeItem(item: RemoveItem): Promise<RemoveItemFromCartResponse> {
    //     return this.client.order.removeItemFromCart({
    //         aggregateId: this.getOrderId(),
    //         orderLineItemId: item.orderLineItemId
    //     }, this.retryPolicy);
    // }


    public async changeItems(addItems: Array<AddItem> = [], removeItems: Array<RemoveItem>): Promise<void> {
        // const addedOrderLineIds = await Promise.all(addItems.map(item => {
        //     return this.addItem(item);
        // }));
        //
        // await Promise.all(removeItems.map(item => {
        //     return this.removeItem(item);
        // }));
        const response = await this.client.order.cartBatchOperation({
            aggregateId: this.getOrderId(),
            operations: this.mapToCartOperations(addItems, removeItems)
        }, this.retryPolicy);

        const validator = new ValidateItemsStatus(response.data.orderLineItemIds, removeItems.map(i => i.orderLineItemId));
        await this.fetchOrder(this.getOrderId(), validator, this.retryPolicy);
    }


    private mapToCartOperations(addItems: Array<AddItem> = [], removeItems: Array<RemoveItem> = []): Array<CartOperation> {
        const operations: Array<CartOperation> = [];
        removeItems.forEach((item) => {
            operations.push({
                operation: CartOperationType.RemoveItem,
                // operation: 'RemoveItem',
                data: item
            })
        });
        addItems.forEach((item) => {
            if(Cart.isAccessCartItem(item)) {
                operations.push({
                    operation: CartOperationType.AddAccessItem,
                    data: item
                })
            } else if(Cart.isProductCartItem(item)) {
                operations.push({
                    operation: CartOperationType.AddProductItem,
                    data: item
                })
            } else {
                throw new Error('Cannot add item. Unknown item type.');
            }
        });

        return operations;
    }


    public async getItemCount(): Promise<number> {
        if(this.hasOrder()) {
            const order = await this.getOrder(this.getOrderId());
            return order.lineItems.filter(item => item.status !== LineItemStatus.removed && item.status !== LineItemStatus.returned).length
        }
        return 0;
    }


    public async addToken(token: string): Promise<void> {
        const retryPolicy = [0, 1000, 1000, 1000];
        const isInFinalState = new IsInFinalState();
        const hasToken = new HasToken(token);

        if(!this.hasOrder() || (this.hasOrder() && isInFinalState.validate(await this.getOrder(this.getOrderId())))) {
            await this.createOrder();
        }

        const orderId = this.getOrderId();
        await this.client.order.addOrderToken({aggregateId: orderId, token}, retryPolicy);
        await this.fetchOrder(orderId, hasToken, this.retryPolicy);
    }


    public async reserve(email?: string, timeoutOn?: string): Promise<void> {
        const canReserve = new CanReserve();
        const isReserved = new IsReserved();
        const orderId = this.getOrderId();
        const order = await this.getOrder(orderId);

        if(canReserve.validate(order)) {
            await this.client.order.reserveOrder({
                aggregateId: orderId,
                timeoutOn: timeoutOn,
                customerEmail: email
            }, this.retryPolicy);
            await this.fetchOrder(this.getOrderId(), isReserved, this.retryPolicy);
        }
    }


    // public async checkout(email?: string, paymentMethod?: string): Promise<CheckoutResult> {
    public async checkout(email?: string, payments?: Array<Payment>, remark?: string, optInOn?: string[]): Promise<CheckoutResult> {
        const paymentResults: Array<PaymentResult> = [];
        const canCheckout = new CanCheckout();
        const canPay = new CanPay();
        // const isCheckedOut = new IsCheckedOut();
        const isCheckedOutOrCompleted = new HasStatus([OrderStatus.checkOut, OrderStatus.completed]);
        const orderId = this.getOrderId();
        const order = await this.getOrder(orderId);

        // checkout if needed
        if (canCheckout.validate(order)) {
            await this.client.order.checkoutOrder({
                aggregateId: orderId,
                customerEmail: email,
                customerRemark: remark,
                optInOn: optInOn
            }, this.retryPolicy);
            await this.fetchOrder(this.getOrderId(), isCheckedOutOrCompleted, this.retryPolicy);
        }

        // pay if needed
        // if(canPay.validate(order) && payments) {
        if(payments && payments.length > 0) {
            payments.sort((a,b) => (a.currencyCode.length < b.currencyCode.length) ? 1 : ((b.currencyCode.length < a.currencyCode.length) ? -1 : 0)); // sort payments so custom currency payments are create first.
            for (let index = 0; index < payments.length; index++) {
                const payment = payments[index];
                const paymentResult = await this.createPayment(payment.currencyCode, payment.amount, payment.method, payment.token, payment.loyaltyCardType, payment.loyaltyCardId, payment.loyaltyCardPin);
                paymentResults.push(paymentResult);
            }
        }

        return {paymentResults};
    }


    // public async getAvailablePaymentMethods(): Promise<void> {
    //     // is anders voor box office als voor online
    // }


    // public getRequiredPayments(): void {
    //     // is anders voor box office als voor online
    // }


    private async createPayment(currencyCode: string, amount: number, method?: string|null, token?: string|null, loyaltyCardType?: string|null, loyaltyCardId?: string|null, loyaltyCardPin?: string|null): Promise<PaymentResult> {
        const customerId = this.hasCustomerId() ? this.getCustomerId() : undefined;
        let paymentId = undefined;
        let action = undefined;

        if(method === 'cash') {
            const response = await this.client.payment.createCashPayment({
                orderId: this.getOrderId(),
                currency: currencyCode,
                amount,
                customerId
            }, [0, 500, 1000]);
            paymentId = response.data.paymentId;
        }
        if(method === 'pin') {
            const response = await this.client.payment.createPinPayment({
                orderId: this.getOrderId(),
                currency: currencyCode,
                amount,
                customerId
            }, [0, 500, 1000]);
            paymentId = response.data.paymentId;
        }
        if(method !== 'cash' && method !== 'pin') {
            // const response = await this.client.payment.createMolliePayment({
            //     orderId: this.getOrderId(),
            //     currency: currencyCode,
            //     amount,
            //     customerId,
            //     paymentMethod: method
            // }, this.retryPolicy);
            const response = await this.client.payment.createPayment({
                orderId: this.getOrderId(),
                currency: currencyCode,
                amount,
                customerId,
                token,
                paymentMethod: method,
                loyaltyCardType,
                loyaltyCardId,
                loyaltyCardPin,
            // }, [0, 500, 1000]);
            }, []);
            paymentId = response.data.paymentId;
            action = {paymentUrl: response.data.paymentUrl};
        }

        if(paymentId) {
            return {paymentId, action}
        }
        throw new Error('Create payment failed.');
    }










    public getOrderId(): string {
        const orderString = localStorage.getItem("te-order");
        if(orderString) {
            const order = JSON.parse(orderString);
            return order.id;
        }
        throw new Error('No order found.');
    }

    private static setOrder(order: Order): void {
        localStorage.setItem("te-order", JSON.stringify(order));
    }

    public hasOrder(): boolean {
        return localStorage.getItem("te-order") !== null;
    }

    public clearOrder(): void {
        localStorage.removeItem("te-order");
    }

    // public getOrderId(): string {
    //     const orderId = localStorage.getItem("te-order-id");
    //     if(orderId) {
    //         return orderId;
    //     }
    //     throw new Error('No order id found.');
    // }

    // private static setOrderId(orderId: string): void {
    //     localStorage.setItem("te-order-id", orderId);
    // }

    // public hasOrderId(): boolean {
    //     return localStorage.getItem("te-order-id") !== null;
    // }



    public async setCustomer(customerId: string): Promise<void> {
        if(this.hasOrder() && !this.hasCustomerId()) {
            await this.client.order.assignToCustomer({
                aggregateId: this.getOrderId(),
                customerId: customerId
            }, this.retryPolicy);
        }
        Cart.setCustomerId(customerId);
        return new Promise((resolve) => resolve())
    }

    public async removeCustomer(): Promise<void> {
        if(this.hasOrder() && !this.hasCustomerId()) {
            await this.client.order.unassignFromCustomer({aggregateId: this.getOrderId()}, this.retryPolicy);
        }
        localStorage.removeItem("te-customer-id");
        return new Promise((resolve) => resolve())
    }

    private static setCustomerId(customerId: string): void {
        localStorage.setItem("te-customer-id", customerId);
    }

    public getCustomerId(): string {
        const customerId = localStorage.getItem("te-customer-id");
        if(customerId) {
            return customerId;
        }
        throw new Error('No customer id found.');
    }

    public hasCustomerId(): boolean {
        return localStorage.getItem("te-customer-id") !== null;
    }




    public getSalesChannelId(): string {
        const salesChannelId = localStorage.getItem("te-sales-channel-id");
        if(salesChannelId) {
            return salesChannelId;
        }
        throw new Error('No sales channel id found.');
    }

    public setSalesChannelId(salesChannelId: string): void {
        localStorage.setItem("te-sales-channel-id", salesChannelId);
    }

    public hasSalesChannelId(): boolean {
        return localStorage.getItem("te-sales-channel-id") !== null;
    }

    public clearSalesChannelId(): void {
        localStorage.removeItem("te-sales-channel-id");
        this.clearRegisterId();
    }

    public getRegisterId(): string {
        const registerId = localStorage.getItem("te-register-id");
        if(registerId) {
            return registerId;
        }
        throw new Error('No register id found.');
    }

    public setRegisterId(registerId: string): void {
        localStorage.setItem("te-register-id", registerId);
    }

    public hasRegisterId(): boolean {
        return localStorage.getItem("te-register-id") !== null;
    }

    public clearRegisterId(): void {
        localStorage.removeItem("te-register-id");
    }

    public getPreferredLanguageCode(): string {
        const preferredLanguageCode = localStorage.getItem("te-preferred-language-code");
        if(preferredLanguageCode) {
            return preferredLanguageCode;
        }
        throw new Error('No preferred language code found.');
    }

    public setPreferredLanguageCode(preferredLanguageCode: string): void {
        localStorage.setItem("te-preferred-language-code", preferredLanguageCode);
    }

    public hasPreferredLanguageCode(): boolean {
        return localStorage.getItem("te-preferred-language-code") !== null;
    }

    public clearPreferredLanguageCode(): void {
        localStorage.removeItem("te-preferred-language-code");
    }


    private static isAccessCartItem(item: AddItem): item is AddAccessItem {
        return (item as AddAccessItem).eventId !== undefined;
    }

    private static isProductCartItem(item: AddItem): item is AddProductItem {
        return (item as AddProductItem).productDefinitionId !== undefined;
    }

    private async sleep(ms: number): Promise<any> {
        return new Promise((resolve: any) => setTimeout(resolve, ms))
    }


}


export interface CartOptions {
    salesChannelId: string,
    registerId: string,
    customerId?: string,
    clientId?: string,
    clientSecret?: string,
    scope?: string,
    authUrl?: string,
    adminApiUrl?: string,
    graphApiUrl?: string
    clearTokenOnSetAuthUrl?: boolean
    preferredLanguageCode?: string
}



export interface AddItem {

}


export interface AddAccessItem extends AddItem {
    eventManagerId: string;
    eventId: string;
    accessDefinitionId: string;
    requestedConditionPath: Array<string>;
    capacityLocationPath?: string;
}

export interface AddProductItem extends AddItem {
    productDefinitionId: string;
    requestedConditionPath: Array<string>;
}

export interface RemoveItem {
    orderLineItemId: string;
}

export interface CheckoutResult {
    paymentResults: Array<PaymentResult>;
}

export interface Payment {
    currencyCode: string;
    amount: number;
    method?: string|null;
    token?: string|null;
    loyaltyCardType?: string|null;
    loyaltyCardId?: string|null;
    loyaltyCardPin?: string|null;
}

export interface PaymentResult {
    paymentId: string;
    action?:  PaymentAction;
}

export interface PaymentAction {

}

export interface RedirectToPaymentPage extends PaymentAction {
    paymentUrl?: string;
}

