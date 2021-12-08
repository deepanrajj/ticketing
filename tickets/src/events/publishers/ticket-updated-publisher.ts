import {Publisher, Subjects, TicketUpdatedEvent} from '@drbooking/common';


export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
    readonly subject = Subjects.TicketUpdated;
}
