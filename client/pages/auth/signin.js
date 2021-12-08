import { useState } from 'react';
import Router from 'next/router';

import useRequest from '../../hooks/use-request';

const SignInPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { doRequest, errors } = useRequest({
        url: '/api/users/signin',
        method: 'post',
        body: {
            email,
            password
        },
        onSuccess: () => Router.push('/')
    });

    const onSubmit = async (event) => {
      event.preventDefault();
      doRequest();
    };
    return (
        <form onSubmit={onSubmit}>
            <h1>Sign in</h1>
            <div className="form-group">
                <label>Email Address</label>
                <input value={email} onChange={event => setEmail(event.target.value)} className="form-control"/>
            </div>
            <div className="form-group">
                <label>Password</label>
                <input value={password} onChange={event => setPassword(event.target.value)} type="password" className="form-control"/>
            </div>
            {errors}
            <button className="btn btn-primary">Sign In</button>
        </form>
    );
};

export default SignInPage;
