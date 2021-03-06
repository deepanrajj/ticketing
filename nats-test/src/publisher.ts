import nats from 'node-nats-streaming';
import {TicketCreatedPublisher} from './events/ticket-created-publisher';
import {TicketCreatedEvent} from './events/ticket-created-event';

console.clear();

const stan = nats.connect('ticketing', 'abc', {
    url: 'http://localhost:4222'
});

stan.on('connect', async () => {
    console.log('Publisher connected to NATS');

    const data: TicketCreatedEvent['data'] = {
        id: '123',
        title: 'Concert',
        price: 20
    };

    const publisher = new TicketCreatedPublisher(stan);
    try {
        await publisher.publish(data);
    } catch (err) {
        console.error(err);
    }
});
