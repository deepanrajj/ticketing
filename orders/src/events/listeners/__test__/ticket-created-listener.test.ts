import {TicketCreatedListener} from '../ticket-created-listener';
import {natsWrapper} from '../../../nats-wrapper';
import {TicketCreatedEvent} from '@drbooking/common';
import mongoose from 'mongoose';
import {Message} from 'node-nats-streaming';
import {Ticket} from '../../../models/ticket';

const setup = async () => {
    // Create a instance of listener
    const listener = new TicketCreatedListener(natsWrapper.client);

    // Create a fake data event
    const data: TicketCreatedEvent['data'] = {
        id: new mongoose.Types.ObjectId().toHexString(),
        version: 0,
        title: 'Concert',
        price: 20,
        userId: new mongoose.Types.ObjectId().toHexString()
    };

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    };

    return { listener, data, msg };
};

it('creates and saves a event', async () => {
    const { listener, data, msg } = await setup();

    // Call the onMessage function
    await listener.onMessage(data, msg);

    // Make assertions to check ticket was created
    const ticket = await Ticket.findById(data.id);

    expect(ticket).toBeDefined();
    expect(ticket!.title).toEqual(data.title);
    expect(ticket!.price).toEqual(data.price);
});


it('acknowledges the message', async () => {
    const { listener, data, msg } = await setup();

    // Call the onMessage function
    await listener.onMessage(data, msg);

    // Make assertions to check ack function was called
    expect(msg.ack).toHaveBeenCalled();
});
