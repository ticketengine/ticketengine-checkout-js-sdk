import {WebClient} from "ticketengine-sdk";
import {GetEventPricesResponse, GetEventResponse, GetOrderResponse} from "./QueryResponse";
import {EventPrice, Order} from "./Model";
import {OrderValidator, CanCheckout, CanPay, HasToken} from "./OrderValidator";



export class Cart {

    client: WebClient;
    salesChannelId: string;
    registerId: string;
    customerId?: string;
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
        this.salesChannelId = options.salesChannelId;
        this.registerId = options.registerId;
        this.customerId = options.customerId;
        this.oauthClientId = options.clientId || 'shopping_cart';
        this.oauthClientSecret = options.clientSecret || '';
        this.oauthScope = options.scope || 'order:write payment:write event:read order:read';
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


    public async getEventPrices(eventId: string, customerId?: string): Promise<Array<EventPrice>> {
        const orderParam = this.hasOrderId() ? `, orderId: "${this.getOrderId()}"` : '';
        const customerParam = customerId ? `, customerId: "${customerId}"` : '';
        const query = `query { eventPrices(eventId: "${eventId}"${orderParam}${customerParam}){conditionId,price,currency,limit,tax,description,conditionPath,accessDefinition{id,name,description,capacityLocations}} }`;
        const response = await this.client.sendQuery<GetEventPricesResponse>(query);
        return response.data.eventPrices;
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
        this.getOrder(orderId, validator, [1000, 1000, 1000, 3000, 5000])
    }


    public async checkout(email: string, paymentMethod?: string, customerId?: string): Promise<CheckoutResult> {
        const retryPolicy = [0, 1000, 1000, 1000, 3000, 5000];
        const canCheckout = new CanCheckout();
        const canPay = new CanPay();
        const orderId = this.getOrderId();
        const order = await this.getOrder(orderId);
        const paymentResults: Array<PaymentResult> = [];

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
                const paymentResult = await this.createPayment(requiredPayment.currency, requiredPayment.amount, paymentMethod, customerId);
                paymentResults.push(paymentResult);
            }
        }

        return {paymentResults};
    }


    // public async getAvailablePaymentMethods(): Promise<void> {
    //     // is anders voor box office als voor online
    // }


    private async createPayment(currency: string, amount: number, method?: string, customerId?: string): Promise<PaymentResult> {
        const retryPolicy = [0, 1000, 1000, 1000, 3000, 5000];
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


    public async createOrder(): Promise<void> {
        const response = await this.client.order.createOrder({salesChannelId: this.salesChannelId, registerId: this.registerId, customerId: this.customerId}, [0, 1000, 1000, 1000, 3000, 5000]);
        this.setOrderId(response.data.orderId);
    }

    public async cancelOrder(): Promise<void> {
        await this.client.order.cancelOrder({aggregateId: this.getOrderId()}, [0, 1000, 1000, 1000, 3000, 5000]);
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

