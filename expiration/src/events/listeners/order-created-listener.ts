import { Listener, OrderCreatedEvent, Subjects } from '@drbooking/common';
import { queueGroupName } from './queue-group-name';
import { Message } from 'node-nats-streaming';
import {expirationQueue} from '../../queues/expiration-queue';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated;
    queueGroupName = queueGroupName;

    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        const delay = new Date(data.expiresAt).getTime() - new Date().getTime();

        // TODO
        await expirationQueue.add(
            {
                orderId: data.id
            },
            {
                delay: 50000
            }
        );

        msg.ack();
    }
}
