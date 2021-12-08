import {DatabaseConnectionError, Listener, OrderCancelledEvent, Subjects} from '@drbooking/common';
import { queueGroupName } from './queue-group-name';
import {Message} from 'node-nats-streaming';
import {Ticket} from '../../models/ticket';
import mongoose from 'mongoose';
import {TicketUpdatedPublisher} from '../publishers/ticket-updated-publisher';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
    readonly subject = Subjects.OrderCancelled;
    queueGroupName = queueGroupName;

    async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
        const ticket = await Ticket.findById(data.ticket.id);

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        ticket.set({ orderId: undefined });

        // HANDLE MONGODB TRANSACTIONS
        const session = await mongoose.startSession();

        // TRANSACTION
        try {
            await session.startTransaction();

            // Save the ticket
            await ticket.save();

            await new TicketUpdatedPublisher(this.client).publish({
                id: ticket.id,
                version: ticket.version,
                title: ticket.title,
                price: ticket.price,
                userId: ticket.userId,
                orderId: ticket.orderId
            });

            await session.commitTransaction();

            // ack the message
            msg.ack();
        } catch (err) {
            // CATCH ANY ERROR DUE TO TRANSACTION
            await session.abortTransaction();

            throw new DatabaseConnectionError();
        } finally {
            // FINALIZE SESSION
            await session.endSession();
        }
    }

}
