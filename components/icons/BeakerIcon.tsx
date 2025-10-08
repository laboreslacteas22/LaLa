import React from 'react';

const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355-.186-.676-.401-.959a.75.75 0 0 0-.712-1.402l-7.5.001c-.414 0-.75.336-.75.75v14.25c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-4.502m0 0a3.001 3.001 0 0 0 3-3V6.087Zm0 0c0-.355.186-.676.401-.959a.75.75 0 0 1 .712-1.402l7.5-.001c.414 0 .75.336.75.75v14.25c0 .414-.336.75-.75.75h-1.5a.75.75 0 0 1-.75-.75v-4.502m0 0a3.001 3.001 0 0 1-3-3V6.087Z" />
  </svg>
);

export default BeakerIcon;
