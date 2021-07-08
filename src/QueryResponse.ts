import {Customer, EventPrice, Order, OrderMessage, ProductDefinition, ProductPrice} from "./Model";

export interface QueryResponse {

}

export interface GetOrderResponse extends QueryResponse {
    data: {
        order: Order
    };
}

export interface GetMeResponse extends QueryResponse {
    data: {
        me: {
            order: Order
        }
    };
}

export interface GetEventResponse extends QueryResponse {
    data: {
        event: Event
    };
}

export interface GetEventPricesResponse extends QueryResponse {
    data: {
        eventPrices: EventPrice[]
    };
}

export interface GetProductDefinitionResponse extends QueryResponse {
    data: {
        productDefinition: ProductDefinition
    };
}

export interface GetProductPricesResponse extends QueryResponse {
    data: {
        productPrices: ProductPrice[]
    };
}

export interface GetCustomerResponse extends QueryResponse {
    data: {
        customer: Customer
    };
}

export interface GetOrderMessageResponse extends QueryResponse {
    data: {
        orderMessage: OrderMessage[]
    };
}
