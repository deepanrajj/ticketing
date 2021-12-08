import { useEffect, useState } from 'react';
import StripeCheckout from 'react-stripe-checkout';
import useRequest from '../../hooks/use-request';
import Router from 'next/router';

const OrderShow = ({ order, currentUser }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const { doRequest, errors } = useRequest({
       url: '/api/payments',
       method: 'post',
       body: {
           orderId: order.id
       },
        onSuccess: () => Router.push('/orders')
    });

    useEffect(() => {
        const findTimeLeft = () => {
            const msLeft = new Date(order.expiresAt) - new Date();
            setTimeLeft(Math.round(msLeft / 1000));
        };

        findTimeLeft();
        const timerId = setInterval(findTimeLeft, 1000);

        return () => {
          clearInterval(timerId);
        };
    }, [order]);

    if (timeLeft < 0) {
        return <div>Order expired</div>;
    }

    return (
      <div>
          Time left to pay: {timeLeft} seconds
          <StripeCheckout
            token={({ id }) => doRequest({ token: id })}
            stripeKey="pk_test_51K44TKD4NK2ZGnd5XdIICGi93jTt0uVi3N6mf51q4lOTZQdtfNSC8icR9xtIHOB9s3VOCNt6rX1onnEG0yHhMXD500W8rwv0Fa"
            amount={order.ticket.price * 100}
            email={currentUser.email}
            currency="eur"
          />
          {errors}
      </div>
    );
};

OrderShow.getInitialProps = async (context, client) => {
    const { orderId } = context.query;
    const { data } = await client.get(`/api/orders/${orderId}`);

    return { order: data };
};

export default OrderShow;
