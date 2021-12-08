import express, {Request, Response} from 'express';
import {
    BadRequestError,
    DatabaseConnectionError,
    NotFoundError,
    OrderStatus,
    requireAuth,
    validateRequest
} from '@drbooking/common';
import {body} from 'express-validator';
import mongoose from 'mongoose';

import {Ticket} from '../models/ticket';
import {Order} from '../models/order';
import {OrderCreatedPublisher} from '../events/publishers/order-created-publisher';
import {natsWrapper} from '../nats-wrapper';


const router = express.Router();

const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post('/api/orders',
    requireAuth,
    body('ticketId')
        .not()
        .isEmpty()
        .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
        .withMessage('Ticket id must be provided'),
    validateRequest,
    async (req: Request, res: Response) => {
    const { ticketId } = req.body;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
        throw new NotFoundError();
    }

    const isReserved = await ticket.isReserved();

    if (isReserved) {
        throw new BadRequestError('Ticket is already reserved');
    }

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

    const order = Order.build({
        userId: req.currentUser!.id,
        status: OrderStatus.Created,
        expiresAt: expiration,
        ticket
    });

    // HANDLE MONGODB TRANSACTIONS
    const session = await mongoose.startSession();

    // TRANSACTION
    try {
        await session.startTransaction();

        await order.save();

        await new OrderCreatedPublisher(natsWrapper.client).publish({
            id: order.id,
            version: order.version,
            status: order.status,
            userId: order.userId,
            expiresAt: order.expiresAt.toISOString(),
            ticket: {
                id: ticket.id,
                price: ticket.price
            }
        });

        await session.commitTransaction();

        res.status(201).send(order);
    } catch (err) {
        // CATCH ANY ERROR DUE TO TRANSACTION
        await session.abortTransaction();

        throw new DatabaseConnectionError();
    } finally {
        // FINALIZE SESSION
        await session.endSession();
    }
});

export { router as newOrderRouter };
