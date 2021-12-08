import {PaymentCreatedEvent, Publisher, Subjects} from '@drbooking/common';

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
    readonly subject = Subjects.PaymentCreated;
}
