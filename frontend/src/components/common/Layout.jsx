import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
        <div className="container mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </>
  );
};

export default Layout;