import React from 'react';

const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6 3.129A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.129v10.7zM14.25 9h.008v.008h-.008V9zm-1.5 0h.008v.008h-.008V9zm-1.5 0h.008v.008h-.008V9zm-1.5 0h.008v.008h-.008V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5h18M3 10.5a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h18a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3Z" />
  </svg>
);

export default PrinterIcon;