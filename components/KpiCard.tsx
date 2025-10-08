import React from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4 transition-all hover:shadow-xl hover:scale-105">
            <div className="bg-brand-lightgreen text-white p-4 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

export default KpiCard;