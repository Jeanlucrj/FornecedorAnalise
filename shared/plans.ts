export const PLANS = {
    free: {
        name: "Teste",
        price: 1,
        limit: 10,
        features: [
            "10 validações/mês",
            "Relatórios básicos",
            "Suporte por email",
            "Plano de teste - R$ 1,00"
        ]
    },
    basic: {
        name: "Básico",
        price: 147,
        limit: 500,
        features: [
            "500 validações/mês",
            "Monitoramento contínuo",
            "Relatórios avançados",
            "API de integração",
            "Suporte prioritário"
        ]
    },
    professional: {
        name: "Profissional",
        price: 297,
        limit: 1000,
        features: [
            "1.000 validações/mês",
            "Monitoramento contínuo",
            "Relatórios avançados",
            "API de integração",
            "Suporte prioritário"
        ]
    },
    enterprise: {
        name: "Empresarial",
        price: 997,
        limit: 999999, // Unlimited
        features: [
            "Validações ilimitadas",
            "White-label",
            "Integração completa",
            "Suporte dedicado",
            "Treinamento incluso"
        ]
    }
};

export type PlanType = keyof typeof PLANS;
