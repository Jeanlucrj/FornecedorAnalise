import axios from 'axios';
import https from 'https';
import fs from 'fs';

export interface MarketData {
    ticker?: string;
    price?: number;
    marketCap?: number;
    currency?: string;
    updatedAt?: Date;
    source?: string;
}

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

function normalizeString(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toUpperCase()
        .replace(/S\/A/g, ' SA ')
        .replace(/S\.A\./g, ' SA ')
        .replace(/S\.A/g, ' SA ')
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export class MarketDataService {
    private brapiBaseUrl = 'https://brapi.dev/api';
    private hgBrasilBaseUrl = 'https://api.hgbrasil.com/finance';
    private recentLogs: string[] = [];

    public getRecentLogs() {
        return this.recentLogs;
    }

    public clearRecentLogs() {
        this.recentLogs = [];
    }

    private get hgBrasilKey() {
        return (process.env.HG_BRASIL_API_KEY || '').trim();
    }

    private get brapiToken() {
        return (process.env.BRAPI_API_KEY || '').trim();
    }

    private logDebug(message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        this.recentLogs.push(logMessage);
        if (this.recentLogs.length > 100) this.recentLogs.shift();

        console.log(message);
        try {
            fs.appendFileSync('market_data_debug.log', logMessage);
        } catch (e) { }
    }

    async getMarketData(companyName: string, cnpj: string, legalNature?: string, existingTicker?: string): Promise<MarketData | null> {
        this.logDebug(`\n========== MARKET DATA SERVICE ==========`);
        this.logDebug(`🔍 Company: ${companyName}`);
        this.logDebug(`🔍 CNPJ: ${cnpj}`);
        this.logDebug(`🔍 Legal Nature: ${legalNature}`);
        this.logDebug(`🔍 Existing Ticker: ${existingTicker}`);
        this.logDebug(`🔑 HG Brasil Key: ${this.hgBrasilKey ? 'Configured' : 'NOT configured'}`);
        this.logDebug(`🔑 Brapi Token: ${this.brapiToken ? 'Configured (' + this.brapiToken.substring(0, 8) + '...)' : 'NOT configured'}`);

        if (!this.hgBrasilKey && !this.brapiToken) {
            this.logDebug(`❌ No API keys configured for Market Data. Results will be N/D.`);
            this.logDebug(`=========================================\n`);
            return null;
        }

        const cleanCnpj = cnpj.replace(/\D/g, '');
        this.logDebug(`📊 Clean CNPJ: ${cleanCnpj}`);

        // Check if CNPJ is in our hardcoded mapping first
        const majorCompanies: { [key: string]: string } = {
            '33000167000101': 'PETR4', '33592510000154': 'VALE3', '60701190000104': 'ITUB4',
            '00776574000156': 'AMER3', '02558157000162': 'VIVT3', '07663140002302': 'CTNM4',
            '76535764000143': 'OIBR3', '02351877000152': 'LWSA3', '60108714000105': 'BOBR4',
            '33041260000192': 'MGLU3', '60394079000104': 'BPAN4', '02685483000194': 'GGBR4',
            '07689002000189': 'EMBR3', // Embraer S.A. (CNPJ correto)
            '60746948000112': 'BRFS3', '60840055000112': 'RADL3',
            '47508411000156': 'CIEL3', '45246410000180': 'UGPA3', '61886888000109': 'CSNA3',
            '50746577000115': 'BEEF3', '16614075000100': 'DIRR3',
        };
        const isInMapping = !!majorCompanies[cleanCnpj];

        // More permissive public company check with normalization
        const normName = normalizeString(companyName);
        const normLegalNature = normalizeString(legalNature || '');

        const isSA = normName.includes(' SA ') || normName.endsWith(' SA');
        const isPublicTerm = normLegalNature.includes('ABERTA') ||
            normLegalNature.includes('SOCIEDADE ANONIMA');

        const isPublicCompany = isSA || isPublicTerm || isInMapping || existingTicker;

        if (!isPublicCompany) {
            this.logDebug(`ℹ️ Not clearly a public company. Name: ${normName}, Legal Nature: ${normLegalNature}`);
            this.logDebug(`=========================================\n`);
            return null;
        }

        this.logDebug(`✅ Company qualified for market data search (SA: ${isSA}, Public Term: ${isPublicTerm}, In Mapping: ${isInMapping}, Has Ticker: ${!!existingTicker})`);

        try {
            // 1. Try to find ticker
            const ticker = existingTicker || await this.findTicker(companyName, cleanCnpj);
            if (!ticker) {
                this.logDebug(`ℹ️ No ticker found for ${companyName}`);
                return null;
            }

            this.logDebug(`✅ Ticker found: ${ticker}`);

            // 2. Fetch data from Brapi or HG Brasil
            const data = await this.fetchTickerData(ticker);
            if (data) {
                this.logDebug(`✅ Market data retrieved successfully!`);
                this.logDebug(`   Ticker: ${data.ticker}, Price: ${data.price}, Market Cap: ${data.marketCap}`);
            } else {
                this.logDebug(`⚠️ Failed to fetch ticker data`);
            }
            this.logDebug(`=========================================\n`);
            return data;
        } catch (error) {
            this.logDebug(`❌ Error in getMarketData: ${error instanceof Error ? error.message : String(error)}`);
            this.logDebug(`=========================================\n`);
            return null;
        }
    }

    private async findTicker(name: string, cnpj: string): Promise<string | null> {
        try {
            // Hardcoded mapping for major Brazilian companies (must match the main mapping)
            const majorCompanies: { [key: string]: string } = {
                '33000167000101': 'PETR4', // PETROBRAS
                '33592510000154': 'VALE3', // VALE
                '60701190000104': 'ITUB4', // ITAU
                '00776574000156': 'AMER3', // AMERICANAS
                '02558157000162': 'VIVT3', // TELEFONICA (VIVO)
                '07663140002302': 'CTNM4', // COTEMINAS
                '76535764000143': 'OIBR3', // OI
                '02351877000152': 'LWSA3', // LOCAWEB
                '60108714000105': 'BOBR4', // BOMBRIL
                '33041260000192': 'MGLU3', // MAGAZINE LUIZA
                '60394079000104': 'BPAN4', // BANCO PAN
                '02685483000194': 'GGBR4', // GERDAU
                '07689002000189': 'EMBR3', // EMBRAER (CNPJ CORRETO)
                '60746948000112': 'BRFS3', // BRF
                '60840055000112': 'RADL3', // RAIA DROGASIL
                '47508411000156': 'CIEL3', // CIELO
                '45246410000180': 'UGPA3', // ULTRAPAR
                '61886888000109': 'CSNA3', // CSN
                '50746577000115': 'BEEF3', // MINERVA
                '16614075000100': 'DIRR3', // DIRECIONAL
            };

            this.logDebug(`🔍 Checking major companies mapping for CNPJ: ${cnpj}`);
            if (majorCompanies[cnpj]) {
                this.logDebug(`✨ Hit major companies mapping: ${majorCompanies[cnpj]}`);
                return majorCompanies[cnpj];
            }

            // Multi-stage search strategy
            const normFullName = normalizeString(name);
            const cleanName = normFullName.replace(/ SA$/g, '').trim();

            const words = cleanName.split(' ').filter(term => term.length >= 2);

            const searchStrategies = [
                cleanName,                  // 1. Full clean name
                words.slice(0, 3).join(' '), // 2. First 3 words
                words.slice(0, 2).join(' '), // 3. First 2 words
                words[0]                     // 4. First word
            ].filter((s, i, self) => s && s.length >= 3 && self.indexOf(s) === i);

            for (const searchTerm of searchStrategies) {
                this.logDebug(`🔍 Trying search strategy: "${searchTerm}"`);

                // Try Brapi search
                if (this.brapiToken) {
                    try {
                        const response = await axios.get(`${this.brapiBaseUrl}/quote/list`, {
                            params: { search: searchTerm, token: this.brapiToken },
                            timeout: 8000,
                            httpsAgent
                        });

                        if (response.data && response.data.stocks && response.data.stocks.length > 0) {
                            const stocks = response.data.stocks;

                            // Check for good matches in results using normalized names
                            const bestMatch = stocks.find((s: any) => {
                                const normStockName = normalizeString(s.name);
                                const normStockTicker = s.stock.toUpperCase();

                                return normFullName.includes(normStockName) ||
                                    normStockName.includes(normFullName) ||
                                    normFullName.includes(normStockTicker);
                            });

                            if (bestMatch) {
                                this.logDebug(`✨ Strategy "${searchTerm}" found ticker: ${bestMatch.stock}`);
                                return bestMatch.stock;
                            }
                        }
                    } catch (e: any) {
                        this.logDebug(`⚠️ Search strategy "${searchTerm}" failed on Brapi: ${e.message}`);
                    }
                }

                // Try HG Brasil "heuristic search" if Brapi fails/missing
                if (this.hgBrasilKey && searchTerm.length >= 4 && searchTerm.length <= 6) {
                    try {
                        const tickerCandidate = searchTerm.substring(0, 4).toUpperCase() + '3';
                        this.logDebug(`🔍 HG Heuristic: Testing candidate "${tickerCandidate}"...`);
                        const hgUrl = `${this.hgBrasilBaseUrl}/stock_price?key=${this.hgBrasilKey}&symbol=${tickerCandidate}`;
                        const response = await axios.get(hgUrl, { timeout: 5000, httpsAgent });
                        if (response.data && response.data.results && response.data.results[tickerCandidate] && !response.data.results[tickerCandidate].error) {
                            this.logDebug(`✨ HG heuristic match found: ${tickerCandidate}`);
                            return tickerCandidate;
                        }
                    } catch (e) { }
                }
            }

            return null;
        } catch (error) {
            this.logDebug(`⚠️ Ticker search failed: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    private async fetchTickerData(ticker: string): Promise<MarketData | null> {
        // 1. Try Brapi first
        if (this.brapiToken) {
            try {
                this.logDebug(`🔍 Fetching data for ${ticker} from Brapi...`);
                const response = await axios.get(`${this.brapiBaseUrl}/quote/${ticker}`, {
                    params: { token: this.brapiToken },
                    timeout: 10000,
                    httpsAgent
                });

                if (response.data && response.data.results && response.data.results[0]) {
                    const result = response.data.results[0];
                    this.logDebug(`✅ Data fetched from Brapi for ${ticker}`);
                    return {
                        ticker: result.symbol,
                        price: result.regularMarketPrice,
                        marketCap: result.marketCap,
                        currency: result.currency,
                        updatedAt: new Date(result.regularMarketTime),
                        source: 'Brapi'
                    };
                } else {
                    this.logDebug(`⚠️ Brapi zero results for ${ticker}: ${JSON.stringify(response.data)}`);
                }
            } catch (brapiError: any) {
                this.logDebug(`⚠️ Brapi fetch failed: ${brapiError.message}`);
            }
        }

        // 2. Fallback to HG Brasil
        if (this.hgBrasilKey) {
            try {
                this.logDebug(`🔍 Falling back to HG Brasil for ${ticker}...`);
                const hgUrl = `${this.hgBrasilBaseUrl}/stock_price?key=${this.hgBrasilKey}&symbol=${ticker}`;
                const response = await axios.get(hgUrl, {
                    timeout: 10000,
                    httpsAgent
                });

                if (response.data && response.data.results && response.data.results[ticker]) {
                    const result = response.data.results[ticker];
                    this.logDebug(`✅ Data fetched from HG Brasil for ${ticker}`);
                    return {
                        ticker: result.symbol,
                        price: result.price,
                        marketCap: result.market_cap,
                        currency: 'BRL',
                        updatedAt: new Date(),
                        source: 'HG Brasil'
                    };
                } else {
                    this.logDebug(`❌ HG Brasil zero results for ${ticker}: ${JSON.stringify(response.data)}`);
                }
            } catch (hgError: any) {
                this.logDebug(`❌ HG Brasil fetch failed: ${hgError.message}`);
            }
        } else {
            this.logDebug('ℹ️ HG Brasil key is missing');
        }

        return null;
    }
}

export const marketDataService = new MarketDataService();
