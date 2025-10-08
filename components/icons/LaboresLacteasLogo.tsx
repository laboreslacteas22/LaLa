import React from 'react';

const LaboresLacteasLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg" {...props}>
        <style>
          {`.labores-text { font-family: serif; font-weight: bold; text-anchor: middle; }`}
        </style>
        <text x="50%" y="40" className="labores-text" fontSize="30" fill="currentColor">LABORES</text>
        <text x="50%" y="75" className="labores-text" fontSize="24" fill="currentColor">=LÁCTEAS=</text>
    </svg>
);

export default LaboresLacteasLogo;