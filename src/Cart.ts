import {WebClient} from "ticketengine-sdk";
import {GetCustomerResponse, GetEventPricesResponse, GetEventResponse, GetOrderResponse} from "./QueryResponse";
import {Customer, EventPrice, Order} from "./Model";
import {OrderValidator, CanCheckout, CanPay, HasToken} from "./OrderValidator";



export class Cart {

    client: WebClient;
    // salesChannelId: string;
    // registerId: string;
    // customerId?: string;
    oauthClientId: string;
    oauthClientSecret: string;
    oauthScope: string;

    // constructor(salesChannelId: string, registerId: string, customerId?: string, clientId?: string, clientSecret?: string, scope?: string, authApiUrl?: string, adminApiUrl?: string, graphApiUrl?: string) {
    constructor(options: CartOptions) {
        this.client = new WebClient({
            authUrl: options.authApiUrl || 'https://auth.ticketengine.io',
            adminApiUrl: options.adminApiUrl || 'https://admin-api.ticketengine.io',
            graphApiUrl: options.graphApiUrl || 'https://graph-api.ticketengine.io'
        });
        // this.salesChannelId = options.salesChannelId;
        // this.registerId = options.registerId;
        // this.customerId = options.customerId;
        this.oauthClientId = options.clientId || 'shopping_cart';
        this.oauthClientSecret = options.clientSecret || '';
        this.oauthScope = options.scope || 'order:write payment:write event:read order:read';
        if(options.salesChannelId) this.setSalesChannelId(options.salesChannelId);
        if(options.registerId) this.setRegisterId(options.registerId);
        if(options.customerId) this.setCustomerId(options.customerId);
    }


    public async login(username: string, password: string): Promise<void> {
        await this.client.user.getAuthToken({
            grantType: 'password',
            clientId: this.oauthClientId,
            clientSecret: this.oauthClientSecret,
            scope: this.oauthScope,
            username: username,
            password: password
        });
    }


    public async getEvent(eventId: string): Promise<Event> {
        const query = `query { event(id: "${eventId}"){id,eventManagerId,name,description,location,start,end,totalCapacity,availableCapacity} }`;
        const response = await this.client.sendQuery<GetEventResponse>(query);
        return response.data.event;
    }


    public async getEventPrices(eventId: string): Promise<Array<EventPrice>> {
        const orderParam = this.hasOrderId() ? `, orderId: "${this.getOrderId()}"` : '';
        const customerParam = this.hasCustomerId() ? `, customerId: "${this.getCustomerId()}"` : '';
        const query = `query { eventPrices(eventId: "${eventId}"${orderParam}${customerParam}){conditionId,price,currency,limit,tax,description,conditionPath,accessDefinition{id,name,description,capacityLocations}} }`;
        const response = await this.client.sendQuery<GetEventPricesResponse>(query);
        return response.data.eventPrices;
    }


    public async getCustomer(customerId: string): Promise<Customer> {
        const query = `query { customer(id: "${customerId}"){id,firstName,lastName,fullName,sortName,birthDate,gender,email,tags{id,name}} }`;
        const response = await this.client.sendQuery<GetCustomerResponse>(query);
        return response.data.customer;
    }


    public async getOrder(orderId: string, validator?: OrderValidator, retryPolicy: Array<number> = []): Promise<Order> {
        const query = `query { order(id: "${orderId}"){id,status,customer{id,fullName},paymentStatus,paymentUrl,tokens{id,typeId,token},requiredPayments{currency,amount},lineItems{ ... on AccessLineItem {id,type,status,price,tax,currency,limit,name,accessDefinition{id},capacityLocationPath,requestedConditionPath,accessId,event{id,eventManagerId,name,location,start,end,availableCapacity}} }} }`;
        const response = await this.client.sendQuery<GetOrderResponse>(query, []);

        // check if order is in desired state
        // if not in desired state, retry query
        if(validator && !validator.validate(response.data.order)) {
            const sleepTime = retryPolicy.shift();

            // abort retry, retries attempts exceeded
            if(sleepTime === undefined) throw new Error('Retry attempts exceeded.');

            // retry
            await this.sleep(sleepTime); // wait x milliseconds
            return await this.getOrder(orderId, validator, retryPolicy)
        }

        this.setOrderId(orderId);
        return response.data.order;
    }


    public async createOrder(): Promise<void> {
        const customerId = this.hasCustomerId() ? this.getCustomerId() : undefined;
        const response = await this.client.order.createOrder({salesChannelId: this.getSalesChannelId(), registerId: this.getRegisterId(), customerId}, [0, 1000, 1000, 1000, 3000, 5000]);
        this.setOrderId(response.data.orderId);
    }


    public async cancelOrder(orderId?: string): Promise<void> {
        if(!orderId) {
            orderId = this.getOrderId()
        }
        await this.client.order.cancelOrder({aggregateId: orderId}, [0, 1000, 1000, 1000, 3000, 5000]);
        if(this.hasOrderId() && this.getOrderId() === orderId) {
            localStorage.removeItem("te-order-id");
        }
    }


    public async addItems(cartItems: Array<CartItem>): Promise<void> {
        const retryPolicy = [0, 0, 0, 1000, 5000];

        if(!this.hasOrderId()) {
            this.createOrder();
        }

        for (let index = 0; index < cartItems.length; index++) {
            const cartItem = cartItems[index];
            if(this.isAccessCartItem(cartItem)) {
                await this.client.order.addAccessToCart({
                    aggregateId: this.getOrderId(),
                    eventManagerId: cartItem.eventManagerId,
                    eventId: cartItem.eventId,
                    accessDefinitionId: cartItem.accessDefinitionId,
                    // capacityLocationPath: cartItem.capacityLocationPath,
                    requestedConditionPath: cartItem.requestedConditionPath,
                }, retryPolicy);
            }
            if(this.isProductCartItem(cartItem)) {

            }
        }
    }


    public async changeItems(): Promise<void> {
        // kan ook alleen een remove doen? omdat quantity eignelijk niet bestaat.
    }


    public async addToken(token: string): Promise<void> {
        const retryPolicy = [0, 1000, 1000, 1000, 3000, 5000];
        const orderId = this.getOrderId();

        if(!this.hasOrderId()) {
            this.createOrder();
        }

        await this.client.order.addOrderToken({aggregateId: orderId, token}, retryPolicy);

        const validator = new HasToken(token);
        await this.getOrder(orderId, validator, [1000, 1000, 1000, 3000, 5000])
    }


    public async checkout(email: string, paymentMethod?: string): Promise<CheckoutResult> {
        const retryPolicy = [0, 1000, 1000, 1000, 3000, 5000];
        const paymentResults: Array<PaymentResult> = [];
        const canCheckout = new CanCheckout();
        const canPay = new CanPay();
        const orderId = this.getOrderId();
        const order = await this.getOrder(orderId);

        // checkout if needed
        if(canCheckout.validate(order)) {
            await this.client.order.checkoutOrder({
                aggregateId: orderId,
                customerEmail: email
            }, retryPolicy)
        }

        // pay if needed
        if(canPay.validate(order) && order.requiredPayments) {
            for (let index = 0; index < order.requiredPayments.length; index++) {
                const requiredPayment = order.requiredPayments[index];
                const paymentResult = await this.createPayment(requiredPayment.currency, requiredPayment.amount, paymentMethod);
                paymentResults.push(paymentResult);
            }
        }

        return {paymentResults};
    }


    // public async getAvailablePaymentMethods(): Promise<void> {
    //     // is anders voor box office als voor online
    // }


    private async createPayment(currency: string, amount: number, method?: string): Promise<PaymentResult> {
        const retryPolicy = [0, 1000, 1000, 1000, 3000, 5000];
        const customerId = this.hasCustomerId() ? this.getCustomerId() : undefined;
        let paymentId = undefined;
        let action = undefined;

        if(method === 'cash') {
            const response = await this.client.payment.createCashPayment({
                orderId: this.getOrderId(),
                currency,
                amount,
                customerId
            }, retryPolicy);
            paymentId = response.data.paymentId;
        }
        if(method === 'pin') {
            const response = await this.client.payment.createPinPayment({
                orderId: this.getOrderId(),
                currency,
                amount,
                customerId
            }, retryPolicy);
            paymentId = response.data.paymentId;
        }
        if(method !== 'cash' && method !== 'pin') {
            const response = await this.client.payment.createMolliePayment({
                orderId: this.getOrderId(),
                currency,
                amount,
                customerId,
                paymentMethod: method
            }, retryPolicy);
            paymentId = response.data.paymentId;
            action = {paymentUrl: response.data.paymentUrl};
        }

        if(paymentId) {
            return {paymentId, action}
        }
        throw new Error('Create payment failed.');
    }






    public setCustomer(customerId: string): Promise<void> {
        this.setCustomerId(customerId);
        return new Promise((resolve: any) => '')
    }

    public removeCustomer(): Promise<void> {
        localStorage.removeItem("te-customer-id");
        return new Promise((resolve: any) => '')
    }

    private setCustomerId(customerId: string): void {
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

    public getOrderId(): string {
        const orderId = localStorage.getItem("te-order-id");
        if(orderId) {
            return orderId;
        }
        throw new Error('No order id found.');
    }

    private setOrderId(orderId: string): void {
        localStorage.setItem("te-order-id", orderId);
    }

    public hasOrderId(): boolean {
        return localStorage.getItem("te-order-id") !== null;
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

    public removeSalesChannelId(): void {
        localStorage.removeItem("te-sales-channel-id");
        this.removeRegisterId();
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

    public removeRegisterId(): void {
        localStorage.removeItem("te-register-id");
    }



    private isAccessCartItem(item: CartItem): item is AccessCartItem {
        return (item as AccessCartItem).eventId !== undefined;
    }

    private isProductCartItem(item: CartItem): item is ProductCartItem {
        return (item as ProductCartItem).productId !== undefined;
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
    authApiUrl?: string,
    adminApiUrl?: string,
    graphApiUrl?: string
}



export interface CartItem {

}


export interface AccessCartItem extends CartItem {
    eventManagerId: string;
    eventId: string;
    accessDefinitionId: string;
    requestedConditionPath: Array<string>;
    capacityLocationPath?: string;
}


export interface ProductCartItem extends CartItem {
    productId: string;
}


export interface CheckoutResult {
    paymentResults: Array<PaymentResult>;
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

