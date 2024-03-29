import {LineItemStatus, Order, OrderStatus, PaymentStatus, RequiredPayment} from "./Model";


export interface OrderValidator {
    validate(order: Order): Boolean;
}


export class IsCompleted implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.completed;
    }
}

export class IsTimeout implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.timeout;
    }
}

export class IsCanceled implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.canceled;
    }
}

export class IsPending implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.pending;
    }
}

export class IsCheckedOut implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.checkOut;
    }
}

export class IsReserved implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.status === OrderStatus.reserved;
    }
}

export class IsPaid implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.paymentStatus === PaymentStatus.paid;
    }
}

export class IsEmpty implements OrderValidator {
    validate(order: Order): Boolean {
        if(!order || !order.lineItems) {
            return true;
        }
        return order.lineItems.filter((item) => {
            // const pendingStatusses: Array<LineItemStatus> = [LineItemStatus.reserved];
            // return pendingStatusses.includes(item.status)
            const status: Array<LineItemStatus> = [LineItemStatus.removed, LineItemStatus.returned];
            return !status.includes(item.status)
        }).length === 0
        // if(!order || !order.lineItems) {
        //     return true;
        // }
        // return order.lineItems.length === 0
    }
}

export class IsInFinalState implements OrderValidator {
    validate(order: Order): Boolean {
        const finalStates: Array<OrderStatus> = [OrderStatus.completed, OrderStatus.canceled, OrderStatus.timeout, OrderStatus.failed];
        return order && finalStates.includes(order.status);
    }
}

export class IsProcessingPayment implements OrderValidator {
    validate(order: Order): Boolean {
        const hasPayments = order && order.payments ? order.payments.length > 0 : false;
        return order && order.status === OrderStatus.checkOut && order.paymentStatus !== PaymentStatus.paid && hasPayments;
    }
}

export class HasCustomer implements OrderValidator {
    validate(order: Order): Boolean {
        return order && order.customer;
    }
}

export class HasToken implements OrderValidator {
    private readonly token: string;

    constructor(token: string) {
        this.token = token;
    }

    validate(order: Order): Boolean {
        return order && order.tokens ? order.tokens.map(t => t.token).includes(this.token) : false;
    }
}

export class HasStatus implements OrderValidator {
    private readonly status: OrderStatus[];

    constructor(status: OrderStatus[]) {
        this.status = status;
    }

    validate(order: Order): Boolean {
        return order && order.status && this.status.includes(order.status)
    }
}

export class HasPaymentWithCurrencyCode implements OrderValidator {
    private readonly currencyCodes: string[];

    constructor(currencyCodes: string[]) {
        this.currencyCodes = currencyCodes;
    }

    validate(order: Order): Boolean {
        // returns true when array contains all values that are in target array
        let includesAll = (arr: string[], target: string[]) => target.every(v => arr.includes(v));

        if(!order || !order.payments) {
            return false;
        }
        return includesAll(order.payments.map(p => p.currency.code), this.currencyCodes);
    }
}

export class HasItemsWithStatus implements OrderValidator {
    private readonly status: LineItemStatus[];

    constructor(status: LineItemStatus[]) {
        this.status = status;
    }

    validate(order: Order): Boolean {
        if(!order || !order.lineItems) {
            return false;
        }
        return order.lineItems.filter((item) => {
            // const pendingStatusses: Array<LineItemStatus> = [LineItemStatus.pending, LineItemStatus.awaitingClaim];
            return this.status.includes(item.status)
        }).length > 0
    }
}

// export class HasPendingItems implements OrderValidator {
//     validate(order: Order): Boolean {
//         if(!order || !order.lineItems) {
//             return false;
//         }
//         return order.lineItems.filter((item) => {
//             const pendingStatusses: Array<LineItemStatus> = [LineItemStatus.pending, LineItemStatus.awaitingClaim];
//             return pendingStatusses.includes(item.status)
//         }).length > 0
//     }
// }


export class ItemsHaveStatus implements OrderValidator {
    private readonly orderLineIds: string[];
    private status: LineItemStatus;

    constructor(orderLineIds: string[], status: LineItemStatus) {
        this.orderLineIds = orderLineIds;
        this.status = status;
    }

    validate(order: Order): Boolean {
        if(!order || !order.lineItems) {
            return false;
        }
        if(this.orderLineIds.length > 0 && order.lineItems.length === 0) {
            return false;
        }
        for(let i = 0; i < this.orderLineIds.length; i++){
            if(!order.lineItems.filter(l => l.status === this.status).map(l => l.id).includes(this.orderLineIds[i])) return false;
        }
        return true;
    }
}


export class ItemsHaveStatusOneOf implements OrderValidator {
    private readonly orderLineIds: string[];
    private status: LineItemStatus[];

    constructor(orderLineIds: string[], status: LineItemStatus[]) {
        this.orderLineIds = orderLineIds;
        this.status = status;
    }

    validate(order: Order): Boolean {
        if(!order || !order.lineItems) {
            return false;
        }
        if(this.orderLineIds.length > 0 && order.lineItems.length === 0) {
            return false;
        }
        // for(let i = 0; i < this.orderLineIds.length; i++){
        //     if(!order.lineItems.filter(l => this.status.includes(l.status)).map(l => l.id).includes(this.orderLineIds[i])) return false;
        // }
        for(let i = 0; i < order.lineItems.length; i++){
            if(this.orderLineIds.includes(order.lineItems[i].id) && !this.status.includes(order.lineItems[i].status)) {
                return false;
            }
        }
        return true;
    }
}


export class NeedsPaymentWithCurrency implements OrderValidator {
    private readonly currencyCode: string;

    constructor(currencyCode: string) {
        this.currencyCode = currencyCode;
    }

    validate(order: Order): Boolean {
        return order && order.requiredPayments ? order.requiredPayments.map((p) => p.currency.code).includes(this.currencyCode) : false;
    }
}

export class NeedsPaymentWithIsoCurrency implements OrderValidator {
    validate(order: Order): Boolean {
        const payments = order && order.payments ? order.payments.filter(p => !['refused', 'cancelled'].includes(p.status) ) : [];
        if(order && order.requiredPayments) {
            for (let i = 0; i < order.requiredPayments.length; i++) {
                const currencyCode = order.requiredPayments[i].currency.code;
                const requiredAmount = order.requiredPayments[i].amount;
                const paidAmount = payments.filter(p => p.currency.code === currencyCode).reduce((total, p) => { return total + p.amount }, 0);
                if(currencyCode.length === 3 && paidAmount < requiredAmount) {
                    return true;
                }
            }
        }
        return false;
    }
}

export class NeedsPaymentWithCustomCurrency implements OrderValidator {
    validate(order: Order): Boolean {
        const payments = order && order.payments ? order.payments.filter(p => !['refused', 'cancelled'].includes(p.status) ) : [];
        if(order && order.requiredPayments) {
            for (let i = 0; i < order.requiredPayments.length; i++) {
                const currencyCode = order.requiredPayments[i].currency.code;
                const requiredAmount = order.requiredPayments[i].amount;
                const paidAmount = payments.filter(p => p.currency.code === currencyCode).reduce((total, p) => { return total + p.amount }, 0);
                if(currencyCode.length > 3 && paidAmount < requiredAmount) {
                    return true;
                }
            }
        }
        return false;
    }
}

export class NeedsLoyaltyCardPayment implements OrderValidator {
    validate(order: Order): Boolean {
        const payments = order && order.payments ? order.payments.filter(p => !['refused', 'cancelled'].includes(p.status) ) : [];
        if(order && order.requiredLoyaltyCardPayments) {
            for (let i = 0; i < order.requiredLoyaltyCardPayments.length; i++) {
                const currencyCode = order.requiredLoyaltyCardPayments[i].currency.code;
                const requiredAmount = order.requiredLoyaltyCardPayments[i].amount;
                const cardType = order.requiredLoyaltyCardPayments[i].cardType;
                const loyaltyCardPayments = payments.filter(p => p.currency.code === currencyCode && p.psp === 'loyalty' && p.method === cardType);
                const paidAmount = loyaltyCardPayments.reduce((total, p) => { return total + p.amount }, 0);
                if(loyaltyCardPayments.length === 0 || paidAmount < requiredAmount) {
                    return true;
                }
            }
        }
        return false;
    }
}


export class ValidateItemsStatus implements OrderValidator {
    private readonly reservedOrderLineIds: string[];
    private readonly removedOrderLineIds: string[];
    private readonly completedOrderLineIds: string[];

    constructor(reservedOrderLineIds: string[] = [], removedOrderLineIds: string[] = [], completedOrderLineIds: string[] = []) {
        this.reservedOrderLineIds = reservedOrderLineIds;
        this.removedOrderLineIds = removedOrderLineIds;
        this.completedOrderLineIds = completedOrderLineIds;
    }

    validate(order: Order): Boolean {
        const reservedValidator = new ItemsHaveStatus(this.reservedOrderLineIds, LineItemStatus.reserved);
        const removedValidator = new ItemsHaveStatus(this.removedOrderLineIds, LineItemStatus.removed);
        const completedValidator = new ItemsHaveStatus(this.completedOrderLineIds, LineItemStatus.completed);
        return reservedValidator.validate(order) && removedValidator.validate(order) && completedValidator.validate(order)
    }
}

export class CanReserve implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        // const isInFinalState: IsInFinalState = new IsInFinalState();
        // const isCheckedOut: IsCheckedOut = new IsCheckedOut();
        // const isReserved: IsReserved = new IsReserved();
        const hasPendingItems: HasItemsWithStatus = new HasItemsWithStatus([LineItemStatus.pending, LineItemStatus.awaitingClaim]);
        return order && (order.status === OrderStatus.pending)
            && !isEmpty.validate(order)
            // && !isInFinalState.validate(order)
            // && !isCheckedOut.validate(order)
            // && !isReserved.validate(order)
            && !hasPendingItems.validate(order)
    }
}

export class CanCheckout implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        // const hasPendingItems: HasPendingItems = new HasPendingItems();
        const hasPendingItems: HasItemsWithStatus = new HasItemsWithStatus([LineItemStatus.pending, LineItemStatus.awaitingClaim]);
        return order && (order.status === OrderStatus.pending || order.status === OrderStatus.reserved)
            && !isEmpty.validate(order)
            && !hasPendingItems.validate(order)
    }
}

export class CanPay implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        // const hasPendingItems: HasPendingItems = new HasPendingItems();
        const hasPendingItems: HasItemsWithStatus = new HasItemsWithStatus([LineItemStatus.pending, LineItemStatus.awaitingClaim]);
        return order && order.paymentStatus !== PaymentStatus.paid
            && (order.status === OrderStatus.pending || order.status === OrderStatus.reserved || order.status === OrderStatus.checkOut)
            && !isEmpty.validate(order)
            && !hasPendingItems.validate(order)
    }
}

export class CanPayOnline implements OrderValidator {
    validate(order: Order): Boolean {
        // const canPay: CanPay = new CanPay();
        const paymentCurrencies = order && order.requiredPayments ? order.requiredPayments.map((rp) => rp.currency.code) : [];
        // return canPay.validate(order) && !paymentCurrencies.includes('CINEVILLE');
        return !paymentCurrencies.includes('CINEVILLE');
    }
}

export class RequiredPaymentMatchLineItems implements OrderValidator {
    validate(order: Order): Boolean {
        if(!order || !order.lineItems) {
            return false;
        }

        // calculate required payments based on order lines
        const calculatedRequiredPayments: RequiredPayment[] = []; //
        for (let i = 0; i < order.lineItems.length; i++) {
            if(order.lineItems[i].status === LineItemStatus.reserved) {
                const index = calculatedRequiredPayments.findIndex((rp) => {return rp.currency.code === order.lineItems[i].currency?.code})
                const currency = order.lineItems[i].currency;
                if(index !== -1) {
                    calculatedRequiredPayments[index].amount += order.lineItems[i].price;
                } else if(currency && order.lineItems[i].price > 0) {
                    calculatedRequiredPayments.push({currency: currency, amount: order.lineItems[i].price})
                }
            }
            if([LineItemStatus.pending, LineItemStatus.awaitingClaim].includes(order.lineItems[i].status)) {
                return false; // terminate if pending order lines are encountered. When pending order lines are present no accurate calculation of the required payment can be made
            }
        }

        // compare calculated required payments with the one from order
        for (let i = 0; i < calculatedRequiredPayments.length; i++) {
            const requiredPayment = order.requiredPayments?.find((orp) => orp.currency.code === calculatedRequiredPayments[i].currency.code);
            if(!requiredPayment || requiredPayment.amount !== calculatedRequiredPayments[i].amount) {
                return false;
            }
        }

        return true;
    }
}


export class AndValidator implements OrderValidator {
    private readonly validators: OrderValidator[];

    constructor(validators: OrderValidator[]) {
        this.validators = validators;
    }

    validate(order: Order): Boolean {
        for (let i = 0; i < this.validators.length; i++) {
            if(!this.validators[i].validate(order)) {
                return false;
            }
        }
        return true;
    }
}

export class NullValidator implements OrderValidator {
    validate(order: Order): Boolean {
        return true;
    }
}
