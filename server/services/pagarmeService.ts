import { Client, OrdersController } from '@pagarme/pagarme-nodejs-sdk';
import fs from 'fs';

// Pagar.me Service - Production Keys Required
const LOG_FILE = 'C:\\Users\\User\\.gemini\\antigravity\\scratch\\FornecedorFlow\\FornecedorFlow\\pagarme_debug.txt';

const logToFile = (message: string, data?: any) => {
    const logEntry = `[${new Date().toISOString()}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    console.log(`#################### PAGARME DEBUG: ${message} ####################`);
    if (data) console.log(JSON.stringify(data, null, 2));
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
};

export class PagarmeService {
    private client: Client | null = null;
    private ordersController: OrdersController | null = null;

    private getControllers() {
        if (!this.client || !this.ordersController) {
            // Trim to remove any whitespace/newlines from environment variable
            const secretKey = (process.env.PAGARME_SECRET_KEY || '').trim();
            console.log(`[PAGARME] Initializing client with key: ${secretKey.slice(0, 10)}...`);
            console.log(`[PAGARME] Key length: ${secretKey.length} chars`);

            this.client = new Client({
                basicAuthCredentials: {
                    username: secretKey,
                    password: '',
                },
            });
            this.ordersController = new OrdersController(this.client);
        }
        return { ordersController: this.ordersController };
    }
    /**
     * Create a payment order for Credit Card, Debit Card or PIX
     */
    async createOrder(params: {
        amount: number;
        paymentMethod: 'credit_card' | 'debit_card' | 'pix';
        customer: {
            name: string;
            email: string;
            cpf?: string;
            phone?: string;
            address?: {
                street?: string;
                number?: string;
                zipCode?: string;
                neighborhood?: string;
                city?: string;
                state?: string;
                line1?: string;
                line2?: string;
            };
        };
        cardToken?: string;
        cardData?: {
            number: string;
            holderName: string;
            expMonth: number;
            expYear: number;
            cvv: string;
        };
        metadata?: {
            userId?: string;
            plan?: string;
            planName?: string;
            [key: string]: any;
        };
    }) {
        const { amount, paymentMethod, customer, cardToken, cardData, metadata } = params;

        const cleanCpf = customer.cpf?.replace(/\D/g, '') || '';
        const customerType = cleanCpf.length > 11 ? 'corporation' : 'individual';
        const customerName = (customer.name || 'Cliente FornecedorFlow').trim();

        // Pagar.me requires at least two names (name and surname)
        const finalName = customerName.split(' ').length < 2 ? `${customerName} Silva` : customerName;

        const userId_for_code = Date.now().toString(); // Fallback

        // Mapping dynamic customer phone
        const rawPhone = customer.phone?.replace(/\D/g, '') || '11988888888';
        const areaCode = rawPhone.length >= 10 ? rawPhone.substring(0, 2) : '11';
        const phoneNumber = rawPhone.length >= 10 ? rawPhone.substring(2) : '988888888';

        const finalAddress = {
            street: customer.address?.street || 'Rua Exemplo',
            number: customer.address?.number || '123',
            zipCode: customer.address?.zipCode?.replace(/\D/g, '') || '01310100',
            neighborhood: customer.address?.neighborhood || 'Centro',
            city: customer.address?.city || 'São Paulo',
            state: customer.address?.state || 'SP',
            country: 'BR',
            complement: '',
            line1: customer.address?.line1 || `${customer.address?.street || 'Rua Exemplo'}, ${customer.address?.number || '123'}`,
            line2: customer.address?.line2 || `${customer.address?.neighborhood || 'Centro'} - ${customer.address?.city || 'São Paulo'}/${customer.address?.state || 'SP'}`,
        };

        const payload: any = {
            code: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            closed: true,
            items: [
                {
                    amount: Math.round(amount),
                    description: 'Upgrade de Plano - FornecedorFlow',
                    quantity: 1,
                    code: `item_${Date.now()}`,
                    category: 'service',
                },
            ],
            customer: {
                name: finalName,
                email: customer.email || 'contato@fornecedorflow.com.br',
                type: customerType,
                document: cleanCpf,
                code: `cust_${userId_for_code}`,
                phones: {
                    mobilePhone: {
                        countryCode: '55',
                        areaCode: areaCode,
                        number: phoneNumber,
                    },
                },
                address: finalAddress,
                metadata: {},
            },
            payments: [],
            metadata: metadata || {},
        };

        console.log("!!! PAGARME REQUEST START !!!");
        console.log(JSON.stringify(payload, null, 2));

        if (paymentMethod === 'pix') {
            // Ensure amount is at least 100 cents (R$ 1.00)
            const pixAmount = Math.max(Math.round(amount), 100);

            payload.payments.push({
                paymentMethod: 'pix',  // SDK expects camelCase
                amount: pixAmount,
                pix: {
                    expiresIn: 3600,  // SDK expects camelCase, value in seconds
                    additionalInformation: [
                        {
                            name: 'Plano',
                            value: metadata?.planName || 'Upgrade FornecedorFlow'
                        }
                    ]
                },
            });

            console.log('[PIX] Payment amount:', pixAmount, 'cents (R$', (pixAmount / 100).toFixed(2), ')');
        } else if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
            if (!cardToken && !cardData) {
                throw new Error(`Token ou dados do cartão são obrigatórios para pagamento com ${paymentMethod}`);
            }

            // Build the card payment object - SDK expects camelCase
            const cardPayment: any = {
                paymentMethod: paymentMethod,
                amount: Math.round(amount),
            };

            // Add payment method specific configuration
            if (paymentMethod === 'credit_card') {
                cardPayment.creditCard = {
                    recurrence: false,
                    installments: 1,
                    statementDescriptor: 'FornecedorFl',
                    operationType: 'auth_and_capture',
                    card: {
                        billingAddress: finalAddress
                    }
                };

                if (cardToken) {
                    cardPayment.creditCard.cardToken = cardToken;
                } else if (cardData) {
                    cardPayment.creditCard.card = {
                        ...cardPayment.creditCard.card,
                        number: cardData.number,
                        holderName: cardData.holderName,
                        expMonth: cardData.expMonth,
                        expYear: cardData.expYear,
                        cvv: cardData.cvv,
                    };
                }
            } else if (paymentMethod === 'debit_card') {
                cardPayment.debitCard = {
                    recurrence: false,
                    installments: 1,
                    statementDescriptor: 'FornecedorFl',
                    billing: {
                        name: finalName,
                        address: finalAddress
                    }
                };

                // Use cardToken if provided, otherwise use cardData
                if (cardToken) {
                    cardPayment.debitCard.cardToken = cardToken;
                } else if (cardData) {
                    cardPayment.debitCard.card = {
                        number: cardData.number,
                        holderName: cardData.holderName,
                        expMonth: cardData.expMonth,
                        expYear: cardData.expYear,
                        cvv: cardData.cvv,
                        billingAddress: finalAddress
                    };
                }
            }

            payload.payments.push(cardPayment);
        }

        try {
            const logData = { customer_email: customer.email, method: paymentMethod, amount };
            const { ordersController } = this.getControllers();

            logToFile(`Creating order`, logData);
            logToFile(`Order Payload`, payload);

            const { result } = await ordersController.createOrder(payload);
            logToFile(`Order result`, result);

            // Detailed charge logging if it failed
            if (result.status === 'failed' && result.charges?.[0]?.lastTransaction) {
                logToFile(`Charge failure details`, result.charges[0].lastTransaction.gatewayResponse);
            }

            // Extra logging for PIX payments
            if (paymentMethod === 'pix') {
                console.log('[PAGARME PIX] Order ID:', result.id);
                console.log('[PAGARME PIX] Order Status:', result.status);
                console.log('[PAGARME PIX] Charges:', JSON.stringify(result.charges, null, 2));

                const charge = result.charges?.[0];
                if (charge) {
                    const lastTx = charge.lastTransaction || (charge as any).last_transaction;
                    console.log('[PAGARME PIX] Last Transaction:', JSON.stringify(lastTx, null, 2));

                    if (lastTx) {
                        console.log('[PAGARME PIX] QR Code URL:', lastTx.qrCodeUrl || lastTx.qr_code_url || 'NOT FOUND');
                        console.log('[PAGARME PIX] QR Code:', lastTx.qrCode || lastTx.qr_code || 'NOT FOUND');
                    }
                }
            }

            return result;
        } catch (error: any) {
            console.error("!!! PAGARME ERROR !!!");
            const errorBody = error.response?.data || error;
            logToFile(`API Error`, errorBody);
            console.error('[PAGARME ERROR] Full error:', JSON.stringify(errorBody, null, 2));
            console.error('[PAGARME ERROR] Error message:', error.message);
            console.error('[PAGARME ERROR] Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Get order status
     */
    async getOrder(orderId: string) {
        try {
            const { ordersController } = this.getControllers();
            const { result } = await ordersController.getOrder(orderId);
            return result;
        } catch (error: any) {
            console.error(`[PAGARME] Error getting order ${orderId}:`, error?.response?.data || error.message);
            throw error;
        }
    }
}

export const pagarmeService = new PagarmeService();
