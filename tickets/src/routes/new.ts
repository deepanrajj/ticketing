import express, { Request, Response } from 'express';
import {DatabaseConnectionError, requireAuth, validateRequest} from '@drbooking/common';
import { body } from 'express-validator';
import mongoose from 'mongoose';

import { Ticket } from '../models/ticket';
import { TicketCreatedPublisher } from '../events/publishers/ticket-created-publisher';
import { natsWrapper } from '../nats-wrapper';

const router = express.Router();

router.post('/api/tickets',
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
        const { title, price } = req.body;
        const ticket = Ticket.build({
            title,
            price,
            userId: req.currentUser!.id
        });

        // HANDLE MONGODB TRANSACTIONS
        const session = await mongoose.startSession();

        // TRANSACTION
        try {
            await session.startTransaction();

            await ticket.save();

            await new TicketCreatedPublisher(natsWrapper.client).publish({
                id: ticket.id,
                version: ticket.version,
                title: ticket.title,
                price: ticket.price,
                userId: ticket.userId
            });

            await session.commitTransaction();

            res.status(201).send(ticket);
        } catch (err) {
            // CATCH ANY ERROR DUE TO TRANSACTION
            await session.abortTransaction();

            throw new DatabaseConnectionError();
        } finally {
            // FINALIZE SESSION
            await session.endSession();
        }
    }
);

export { router as createTicketRouter };
