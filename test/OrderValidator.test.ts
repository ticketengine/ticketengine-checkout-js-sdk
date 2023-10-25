// import { enableFetchMocks } from 'jest-fetch-mock'
// enableFetchMocks()
//
// import {GenericCommand} from "../../src/command/GenericCommand";
//
// const url = 'https://api.ticketengine.io';
// const name = 'ReserveAccess';
// const body = {orderId: '1', orderLineItemId: '2'};
// const clientId = 'a';
// const userId = 'b';
// const correlationId = 'c';


import {AndValidator, IsCompleted, IsEmpty, RequiredPaymentMatchLineItems} from "../src/OrderValidator";
import {LineItemStatus, LineItemType, Order, OrderStatus} from "../src/Model";

describe("RequiredPaymentMatchLineItems", () => {
    // beforeEach(() => {
    //     fetchMock.resetMocks()
    // });

    test("Success", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 23}
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.reserved, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeTruthy()
    });


    test("Success: check multiple currencies ", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 12.5},
                {currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, amount: 14},
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Special', currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, price: 9, tax: 0},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Special', currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, price: 5, tax: 0},
                {id: 'li4', type: LineItemType.access, status: LineItemStatus.reserved, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeTruthy()
    });


    test("Success: with free order lines and no required payment", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 0, tax: 0},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Special', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 0, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeTruthy()
    });

    test("Success: ignore removed and returned order lines", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 23}
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li4', type: LineItemType.access, status: LineItemStatus.removed, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li5', type: LineItemType.access, status: LineItemStatus.returned, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.reserved, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeTruthy()
    });

    test("Failure: if not match", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 22.5}
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.reserved, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeFalsy();
    });

    test("Failure: if not match with multiple currencies", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 12.5},
                {currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, amount: 9},
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Special', currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, price: 9, tax: 0},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Special', currency: {name: 'Custom', code: 'CUSTOM', exponent: 2, symbol: 'TE'}, price: 5, tax: 0},
                {id: 'li4', type: LineItemType.access, status: LineItemStatus.reserved, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeFalsy();
    });

    test("Failure: if no required payment and reserved order lines with value", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeFalsy();
    });

    test("Failure: if has pending order lines", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 21}
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.pending, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeFalsy();
    });

    test("Failure: if has awaiting claim order lines", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.pending,
            requiredPayments: [
                {currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, amount: 21}
            ],
            lineItems: [
                {id: 'li1', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li2', type: LineItemType.access, status: LineItemStatus.reserved, name: 'Regular', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 10.5, tax: 0.5},
                {id: 'li3', type: LineItemType.access, status: LineItemStatus.awaitingClaim, name: 'VIP', currency: {name: 'Euro', code: 'EUR', exponent: 2, symbol: '€'}, price: 2, tax: 0},
            ]
        };
        const validator = new RequiredPaymentMatchLineItems();
        expect(validator.validate(order)).toBeFalsy();
    });

});





describe("AndValidator", () => {

    test("Return true when all validators are true", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.completed,
            requiredPayments: [],
            lineItems: []
        };
        const validator = new AndValidator([
            new IsCompleted(),
            new IsEmpty(),
        ]);
        expect(validator.validate(order)).toBeTruthy();
    });

    test("Return false if a validator returns false", async () => {
        const order: Order = {
            id: '1',
            registerId: '2',
            salesChannel: {id: '3', name: 'Website', description: ''},
            status: OrderStatus.reserved,
            requiredPayments: [],
            lineItems: []
        };
        const validator = new AndValidator([
            new IsEmpty(),
            new IsCompleted(),
            new IsEmpty(),
        ]);
        expect(validator.validate(order)).toBeFalsy();
    });

});