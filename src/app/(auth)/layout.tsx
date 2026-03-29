import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className='my-10'>{children}</div>;
}
