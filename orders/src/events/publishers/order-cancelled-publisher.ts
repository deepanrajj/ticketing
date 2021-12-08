import {OrderCancelledEvent, Publisher, Subjects} from '@drbooking/common';

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
    readonly subject = Subjects.OrderCancelled;
}
