import mongoose from 'mongoose';

import { Order, OrderStatus } from './order';
import {updateIfCurrentPlugin} from 'mongoose-update-if-current';

// The properties required for a new Ticket
interface TicketAttrs {
  id: string;
  title: string;
  price: number;
}

// The properties that a Ticket Model has (entire collection of tickets looks like)
interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
  findByEvent(event: { id: string, version: number }): Promise<TicketDoc | null>;
}

// The properties that a Ticket Document has (single ticket)
export interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  version: number;
  isReserved(): Promise<boolean>;
}

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  versionKey: 'version',
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
    }
  }
});

ticketSchema.plugin(updateIfCurrentPlugin);

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket({
    _id: attrs.id,
    title: attrs.title,
    price: attrs.price
  });
};

ticketSchema.statics.findByEvent = (data: { id: string, version: number }) => {
  return Ticket.findOne({
    _id: data.id,
    version: data.version - 1
  })
};

ticketSchema.methods.isReserved = async function () {
  const existingUser = await Order.findOne({
    ticket: this,
    status: {
      $in: [
          OrderStatus.Created,
          OrderStatus.AwaitingPayment,
          OrderStatus.Complete
      ]
    }
  });

  return !!existingUser;
}

const Ticket = mongoose.model<TicketDoc, TicketModel>('Ticket', ticketSchema);

export { Ticket };
