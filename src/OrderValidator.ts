import {LineItemStatus, Order, OrderStatus, PaymentStatus} from "./Model";


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
        for(let i = 0; i < this.orderLineIds.length; i++){
            if(!order.lineItems.filter(l => l.status === this.status).map(l => l.id).includes(this.orderLineIds[i])) return false;
        }
        return true;
    }
}

// export class HasReservedItems implements OrderValidator {
//     private readonly orderLineIds: string[];
//
//     constructor(orderLineIds: string[]) {
//         this.orderLineIds = orderLineIds;
//     }
//
//     validate(order: Order): Boolean {
//         if(!order || !order.lineItems) {
//             return false;
//         }
//         for(let i = 0; i < this.orderLineIds.length; i++){
//             if(!order.lineItems.filter(l => l.status === LineItemStatus.reserved).map(l => l.id).includes(this.orderLineIds[i])) return false;
//         }
//         return true;
//     }
// }

// export class HasRemovedItems implements OrderValidator {
//     private readonly orderLineIds: string[];
//
//     constructor(orderLineIds: string[]) {
//         this.orderLineIds = orderLineIds;
//     }
//
//     validate(order: Order): Boolean {
//         if(!order || !order.lineItems) {
//             return false;
//         }
//         for(let i = 0; i < this.orderLineIds.length; i++){
//             if(!order.lineItems.filter(l => l.status === LineItemStatus.removed).map(l => l.id).includes(this.orderLineIds[i])) return false;
//         }
//         return true;
//     }
// }

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
        return order && order.status === OrderStatus.checkOut && order.paymentStatus !== PaymentStatus.paid
    }
}

export class CanCheckout implements OrderValidator {
    validate(order: Order): Boolean {
        const isEmpty: IsEmpty = new IsEmpty();
        // const hasPendingItems: HasPendingItems = new HasPendingItems();
        const hasPendingItems: HasItemsWithStatus = new HasItemsWithStatus([LineItemStatus.pending, LineItemStatus.awaitingClaim]);
        return order && order.status === OrderStatus.pending
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
        return order && order.tokens ? order.tokens.map(t => t.token).includes(this.token) : false;
    }
}

export class NullValidator implements OrderValidator {
    validate(order: Order): Boolean {
        return true;
    }
}
