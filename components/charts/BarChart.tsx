import React from 'react';

interface BarChartData {
    label: string;
    value: number;
}

interface BarChartProps {
    data: BarChartData[];
    title: string;
    icon: React.ReactNode;
    formatValue: (value: number) => string;
    barColorClass?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, icon, formatValue, barColorClass = 'bg-brand-green' }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg h-full">
            <h3 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2 flex items-center">
                {icon}
                {title}
            </h3>
            <div className="space-y-4">
                {data.length > 0 ? (
                    data.map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-5 items-center gap-2 text-sm">
                            <div className="col-span-2 font-medium text-gray-600 truncate" title={label}>{label}</div>
                            <div className="col-span-3">
                                <div className="w-full bg-gray-200 rounded-full h-7 relative group">
                                    <div
                                        className={`${barColorClass} h-7 rounded-full transition-all duration-500 ease-out`}
                                        style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }}
                                    ></div>
                                    <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-white shadow-sm">
                                        {formatValue(value)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-8">No hay datos para mostrar.</p>
                )}
            </div>
        </div>
    );
};

export default BarChart;
