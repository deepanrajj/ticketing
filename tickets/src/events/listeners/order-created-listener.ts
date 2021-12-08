import {DatabaseConnectionError, Listener, OrderCreatedEvent, Subjects} from '@drbooking/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import {Ticket} from '../../models/ticket';
import mongoose from 'mongoose';
import {TicketUpdatedPublisher} from '../publishers/ticket-updated-publisher';


export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated;
    queueGroupName = queueGroupName;

    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        // Find the ticket the order is reserving
        const ticket = await Ticket.findById(data.ticket.id);

        // If no ticket, throw error
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        // Mark the ticket as being reserved by setting its orderId property
        ticket.set({ orderId: data.id });

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
