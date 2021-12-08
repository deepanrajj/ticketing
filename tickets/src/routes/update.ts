import express, { Request, Response } from 'express';
import {
    BadRequestError,
    DatabaseConnectionError,
    NotAuthorizedError,
    NotFoundError,
    requireAuth,
    validateRequest
} from '@drbooking/common';
import { body } from 'express-validator';
import mongoose from 'mongoose';

import { Ticket } from '../models/ticket';
import { natsWrapper } from '../nats-wrapper';
import { TicketUpdatedPublisher } from '../events/publishers/ticket-updated-publisher';

const router = express.Router();

router.put('/api/tickets/:id',
    requireAuth,
    [
        body('title')
            .not()
            .isEmpty()
            .withMessage('Title is required'),
        body('price')
            .isFloat({ gt: 0 })
            .withMessage('Price should be greater than 0')
    ],
    validateRequest,
    async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
        throw new NotFoundError();
    }

    if (ticket.orderId) {
        throw new BadRequestError('Cannot edit a reserved ticket');
    }

    if (ticket.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError();
    }

    const { title, price } = req.body;

    ticket.set({
        title,
        price
    });


    // HANDLE MONGODB TRANSACTIONS
    const session = await mongoose.startSession();

    // TRANSACTION
    try {
        await session.startTransaction();

        await ticket.save();

        await new TicketUpdatedPublisher(natsWrapper.client).publish({
            id: ticket.id,
            version: ticket.version,
            title: ticket.title,
            price: ticket.price,
            userId: ticket.userId
        });

        await session.commitTransaction();

        res.status(200).send(ticket);
    } catch (err) {
        // CATCH ANY ERROR DUE TO TRANSACTION
        await session.abortTransaction();

        throw new DatabaseConnectionError();
    } finally {
        // FINALIZE SESSION
        await session.endSession();
    }
});

export { router as updateTicketRouter };
