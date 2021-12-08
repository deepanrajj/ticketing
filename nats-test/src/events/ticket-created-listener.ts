import { Message } from 'node-nats-streaming';

import { Listener } from './listener';
import { TicketCreatedEvent } from './ticket-created-event';
import { Subjects } from './subjects';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
    readonly subject = Subjects.TicketCreated;
    queueGroupName = 'payments-service';

    onMessage(data: TicketCreatedEvent['data'], msg: Message): void {
        console.log('data: ' + data, data.title);
        console.log('Message subject: ' + msg.getData() + msg.getSubject());

        msg.ack();
    }
}
