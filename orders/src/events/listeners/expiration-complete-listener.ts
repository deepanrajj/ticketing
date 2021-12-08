import {DatabaseConnectionError, ExpirationCompleteEvent, Listener, OrderStatus, Subjects} from '@drbooking/common';
import { queueGroupName } from './queue-group-name';
import { Message } from 'node-nats-streaming';
import {Order} from '../../models/order';
import {OrderCancelledPublisher} from '../publishers/order-cancelled-publisher';
import mongoose from 'mongoose';

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
    readonly subject = Subjects.ExpirationComplete;
    queueGroupName = queueGroupName;

    async onMessage(data: ExpirationCompleteEvent['data'], msg: Message) {
        const order = await Order.findById(data.orderId).populate('ticket');

        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status === OrderStatus.Complete) {
            return msg.ack();
        }

        order.set({
            status: OrderStatus.Cancelled
        });

        // HANDLE MONGODB TRANSACTIONS
        const session = await mongoose.startSession();

        // TRANSACTION
        try {
            await session.startTransaction();

            await order.save();

            await new OrderCancelledPublisher(this.client).publish({
                id: order.id,
                version: order.version,
                ticket: {
                    id: order.ticket.id
                }
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
