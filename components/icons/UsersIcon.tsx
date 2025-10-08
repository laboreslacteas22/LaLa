import React from 'react';

const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.53-2.475M15 19.128v-3.863m0 3.863A9.373 9.373 0 0 1 12 21c-2.636 0-5.09-1.1-6.879-2.872A4.125 4.125 0 0 1 12 15.128V19.128M15 19.128A6 6 0 1 1 21 12a6 6 0 0 1-6 6.128Zm-6 0A6 6 0 1 0 3 12a6 6 0 0 0 6 6.128Zm-6 0A6 6 0 1 1 9 12a6 6 0 0 1-6 6.128Z" />
    </svg>
);

export default UsersIcon;