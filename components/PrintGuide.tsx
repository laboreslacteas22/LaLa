import React, { useEffect } from 'react';
import { Order, PaymentMethod } from '../types';

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

// El SVG del logo se incrusta directamente para que la ventana de impresión sea autocontenida.
const laboresLacteasLogoString = `
<svg viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg" class="label-header-svg" fill="currentColor">
    <style>
      .labores-text { font-family: serif; font-weight: bold; text-anchor: middle; }
    </style>
    <text x="50%" y="40" class="labores-text" font-size="30">LABORES</text>
    <text x="50%" y="75" class="labores-text" font-size="24">=LÁCTEAS=</text>
</svg>
`;

const PrintGuide: React.FC<{ orders: Order[]; onClose: () => void }> = ({ orders, onClose }) => {
    useEffect(() => {
        if (orders.length === 0) return;

        const printWindow = window.open('', '_blank', 'height=800,width=600');
        if (!printWindow) {
            alert('No se pudo abrir la ventana de impresión. Revisa si tu navegador está bloqueando pop-ups.');
            onClose();
            return;
        }
        
        const styles = `
            @page {
                size: 10cm 15cm;
                margin: 0;
            }
            body {
                margin: 0;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .shipping-label {
                width: 10cm;
                height: 15cm;
                page-break-after: always;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                padding: 0.5cm;
                color: #1f2937;
            }
            .label-header { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; }
            .label-header-svg { height: 3.5rem; width: auto; color: #3c4220; }
            .label-main { flex: 1 1 0%; display: flex; flex-direction: column; font-size: 12px; }
            .shipping-address { text-align: right; margin-bottom: 0.75rem; }
            .shipping-address h3 { font-weight: 800; font-size: 14px; text-transform: uppercase; color: #374151; letter-spacing: 0.05em; margin: 0; }
            .shipping-address-details { color: #1f2937; margin-top: 0.25rem; }
            .shipping-address-details p { margin: 0; line-height: 1.4; }
            .items-section { border-top: 2px solid #3c4220; border-bottom: 2px solid #3c4220; padding: 0.5rem 0; margin: 0.5rem 0; }
            .items-header { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; color: #374151; letter-spacing: 0.05em; }
            .items-list { margin-top: 0.5rem; }
            .item { display: flex; justify-content: space-between; align-items: center; color: #1f2937; margin-bottom: 0.25rem; }
            .item-name { width: 80%; }
            .item-qty { font-weight: 600; text-align: right; }
            .total-section { margin-top: auto; padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #3c4220; font-weight: 700; font-size: 16px; }
            .total-label { text-transform: uppercase; letter-spacing: 0.05em; }
            .total-value { font-size: 18px; }
            .label-footer { text-align: center; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed #9ca3af; }
            .footer-p1 { font-style: italic; color: #4b5563; font-size: 12px; margin:0; }
            .footer-p2 { font-weight: 700; color: #3c4220; font-size: 14px; margin-top: 0.25rem; margin-bottom:0; }
        `;

        const labelsHtml = orders.map(order => `
            <div class="shipping-label">
                <header class="label-header">
                    ${laboresLacteasLogoString}
                </header>
                <main class="label-main">
                    <section class="shipping-address">
                        <h3>Dirección de Envío</h3>
                        <div class="shipping-address-details">
                            <p style="font-weight: 700;">${order.customerName}</p>
                            <p>Doc: ${order.customerId}</p>
                            <p>${order.address}</p>
                            <p>Tel: ${order.phone}</p>
                        </div>
                    </section>
                    <section class="items-section">
                        <div class="items-header">
                            <span>ARTÍCULOS</span>
                            <span>CANT.</span>
                        </div>
                        <div class="items-list">
                            ${order.lineItems.map(item => `
                                <div class="item">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-qty">${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                    <section class="total-section">
                        <span class="total-label">Total a cobrar</span>
                        <span class="total-value">
                            ${order.paymentMethod === PaymentMethod.Cash ? formatCurrency(order.totalValue) : 'PAGADO'}
                        </span>
                    </section>
                </main>
                <footer class="label-footer">
                    <p class="footer-p1">¡Te encantarán nuestros productos!</p>
                    <p class="footer-p2">Labores Lácteas</p>
                </footer>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Guías</title>
                    <style>${styles}</style>
                </head>
                <body>
                    ${labelsHtml}
                </body>
            </html>
        `);

        printWindow.document.close();
        
        const tryPrint = () => {
            // Se comprueba el estado del documento para asegurar que todo el contenido (incluyendo imágenes como el SVG) esté listo.
            if (printWindow.document.readyState === 'complete') {
                printWindow.focus(); // Enfocar la nueva ventana es importante para algunos navegadores.
                printWindow.print();
                printWindow.close();
            } else {
                // Si no está listo, se reintenta en un momento.
                setTimeout(tryPrint, 150);
            }
        };

        // Iniciar el proceso de impresión.
        // Usar onload es más robusto para esperar a que todo, incluyendo scripts o imágenes, cargue.
        printWindow.onload = tryPrint;

        onClose();
    }, [orders, onClose]);

    // Este componente no renderiza nada en el DOM principal de la aplicación, solo gestiona la impresión.
    return null;
};

export default PrintGuide;