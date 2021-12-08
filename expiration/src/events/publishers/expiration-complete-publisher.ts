import { ExpirationCompleteEvent, Publisher, Subjects } from '@drbooking/common';

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
    readonly subject = Subjects.ExpirationComplete;
}
