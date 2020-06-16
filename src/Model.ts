


export enum OrderStatus {
    pending = 'pending',
    checkOut = 'checkOut',
    reserved = 'reserved',
    completed = 'completed',
    canceled = 'canceled',
    timeout = 'timeout',
    failed = 'failed',
}

export enum PaymentStatus {
    paid = 'paid',
    pending = 'pending',
    none = 'none',
}

export enum LineItemStatus {
    pending = 'pending',
    awaitingClaim = 'awaitingClaim',
    reserved = 'reserved',
    completed = 'completed',
    removed = 'removed',
}

export enum LineItemType {
    access = 'access',
    product = 'product',
}

export interface RequiredPayment {
    currency: string;
    amount: number;
}

export interface AccessDefinition {
    id: string;
    name: string;
    description?: string;
    capacityLocations?: string[];
}

export interface Event {
    id: string;
    eventManagerId: string;
    name: string;
    description?: string;
    location?: any;
    start: Date;
    end: Date;
    totalCapacity?: number;
    availableCapacity?: number;
}

export interface EventPrice {
    conditionId: string;
    price: number;
    currency: string;
    tax: number;
    description: string;
    conditionPath: string[];
    limit?: any;
    accessDefinition: AccessDefinition;
}

export interface LineItem {
    id: string;
    type: LineItemType;
    status: LineItemStatus;
    price: number;
    tax: number;
    limit?: any;
    name: string;
}

export interface AccessLineItem extends LineItem {
    accessId: string;
    capacityLocationPath?: any;
    requestedConditionPath: string[];
    accessDefinition: AccessDefinition;
    event: Event;
}

export interface SalesChannel {
    id: string;
    name: string;
    description?: string;
}

export interface OrderToken {
    id: string;
    typeId: string;
    token: string;
}

export interface Order {
    id: string;
    registerId: string;
    salesChannel: SalesChannel;
    status: OrderStatus;
    customer?: any;
    tokens?: OrderToken[];
    paymentStatus?: PaymentStatus;
    paymentUrl?: string;
    requiredPayments?: RequiredPayment[];
    lineItems: LineItem[];
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    sortName: string;
    birthDate?: string;
    gender?: string;
    tags?: string;
}

