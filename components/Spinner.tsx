
import React from 'react';
import SpinnerIcon from './icons/SpinnerIcon';

const Spinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-2" role="status" aria-label="Cargando">
            <SpinnerIcon className="w-12 h-12 text-brand-green animate-spin" />
            <span className="text-lg font-semibold text-brand-darkgreen">Cargando...</span>
        </div>
    );
};

export default Spinner;
