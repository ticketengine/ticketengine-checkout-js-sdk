import {LineItemStatus, Order, OrderStatus, PaymentStatus} from "./Model";


export interface OrderValidator {
    validate(order: Order): Boolean;
}


export class IsCompleted implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.completed;
    }
}

export class IsTimeout implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.timeout;
    }
}

export class IsCanceled implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.canceled;
    }
}

export class IsPending implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.pending;
    }
}

export class IsCheckedOut implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.checkOut;
    }
}

export class HasPendingItems implements OrderValidator {
    validate(order: Order): Boolean {
        return order.lineItems.filter((item) => {
            const pendingStatusses: Array<LineItemStatus> = [LineItemStatus.pending, LineItemStatus.awaitingClaim];
            return pendingStatusses.includes(item.status)
        }).length > 0
    }
}

export class IsEmpty implements OrderValidator {
    validate(order: Order): Boolean {
        // return order.lineItems.filter((item) => {
        //     const pendingStatusses: Array<LineItemStatus> = [LineItemStatus.reserved];
        //     return pendingStatusses.includes(item.status)
        // }).length === 0
        return order.lineItems.length === 0
    }
}

export class IsInFinalState implements OrderValidator {
    validate(order: Order): Boolean {
        const finalStates: Array<OrderStatus> = [OrderStatus.completed, OrderStatus.canceled, OrderStatus.timeout, OrderStatus.failed, OrderStatus.reserved];
        return finalStates.includes(order.status);
    }
}

export class IsProcessingPayment implements OrderValidator {
    validate(order: Order): Boolean {
        return order.status === OrderStatus.checkOut && order.paymentStatus !== PaymentStatus.paid
    }
}

export class CanCheckout implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        const hasPendingItems: HasPendingItems = new HasPendingItems();
        return order.status === OrderStatus.pending
            && !isEmpty.validate(order)
            && !hasPendingItems.validate(order)
    }
}

export class CanPay implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        const hasPendingItems: HasPendingItems = new HasPendingItems();
        return order.paymentStatus !== PaymentStatus.paid
            && (order.status === OrderStatus.pending || order.status === OrderStatus.checkOut)
            && !isEmpty.validate(order)
            && !hasPendingItems.validate(order)
    }
}

export class HasToken implements OrderValidator {
    private readonly token: string;

    constructor(token: string) {
        this.token = token;
    }

    validate(order: Order): Boolean {
        return order.tokens ? order.tokens.map(t => t.token).includes(this.token) : false;
    }
}

export class NullValidator implements OrderValidator {
    validate(order: Order): Boolean {
        return true;
    }
}
