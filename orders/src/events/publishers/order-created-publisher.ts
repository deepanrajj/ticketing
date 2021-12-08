import {OrderCreatedEvent, Publisher, Subjects} from '@drbooking/common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated;
}
