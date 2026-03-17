import { Client, OrdersController } from '@pagarme/pagarme-nodejs-sdk';
import fs from 'fs';

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
            const secretKey = process.env.PAGARME_SECRET_KEY || '';
            console.log(`[PAGARME] Initializing client with key: ${secretKey.slice(0, 10)}...`);

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
            payload.payments.push({
                paymentMethod: 'pix',
                amount: Math.round(amount),
                pix: {
                    expiresIn: 3600, // 1 hour
                    additionalInformation: [
                        {
                            name: 'Plano',
                            value: 'Upgrade FornecedorFlow'
                        }
                    ]
                },
            });
        } else if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
            if (!cardToken && !cardData) {
                throw new Error(`Token ou dados do cartão são obrigatórios para pagamento com ${paymentMethod}`);
            }

            // Build the card payment object - SDK expects camelCase!
            const cardPayment: any = {
                paymentMethod: paymentMethod,
                amount: Math.round(amount),
            };

            // The SDK expects camelCase keys: creditCard, debitCard
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

            return result;
        } catch (error: any) {
            console.error("!!! PAGARME ERROR !!!");
            const errorBody = error.response?.data || error;
            logToFile(`API Error`, errorBody);
            console.error(JSON.stringify(errorBody, null, 2));
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
