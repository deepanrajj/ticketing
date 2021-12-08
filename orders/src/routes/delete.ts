import express, { Request, Response } from 'express';
import {DatabaseConnectionError, NotAuthorizedError, NotFoundError, requireAuth} from '@drbooking/common';
import mongoose from 'mongoose';

import {Order, OrderStatus} from '../models/order';
import {OrderCancelledPublisher} from '../events/publishers/order-cancelled-publisher';
import {natsWrapper} from '../nats-wrapper';

const router = express.Router();

router.delete('/api/orders/:orderId',
    requireAuth,
    async (req: Request, res: Response) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new Error('Order id is not valid');
    }

    const order = await Order.findById(orderId).populate('ticket');

    if (!order) {
        throw new NotFoundError();
    }

    if (order.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError();
    }

    order.status = OrderStatus.Cancelled;

    // HANDLE MONGODB TRANSACTIONS
    const session = await mongoose.startSession();

    // TRANSACTION
    try {
        await session.startTransaction();

        await order.save();

        await new OrderCancelledPublisher(natsWrapper.client).publish({
            id: order.id,
            version: order.version,
            ticket: {
                id: order.ticket.id
            }
        });

        await session.commitTransaction();

        res.status(204).send(order);
    } catch (err) {
        // CATCH ANY ERROR DUE TO TRANSACTION
        await session.abortTransaction();

        throw new DatabaseConnectionError();
    } finally {
        // FINALIZE SESSION
        await session.endSession();
    }
});

export { router as deleteOrderRouter };
