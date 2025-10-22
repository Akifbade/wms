
import React from 'react';

interface NotificationProps {
    message: string | null;
    isError?: boolean;
}

const Notification: React.FC<NotificationProps> = ({ message, isError }) => {
    // Add isError to props and conditionally apply an 'error' class to support different notification types.
    const classNames = [
        message ? 'show' : '',
        isError ? 'error' : ''
    ].filter(Boolean).join(' ');

    return (
        <div id="notification" className={classNames} role="alert" aria-live="assertive">
            {message}
        </div>
    );
};

export default Notification;
