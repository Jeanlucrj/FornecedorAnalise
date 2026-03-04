import { Validation, Supplier, Partner } from "@shared/schema";
import PDFDocument from 'pdfkit';

interface ReportData {
  validation: Validation;
  supplier: Supplier | null;
  partners: Partner[];
}

class ReportService {
  async generatePDF(data: ReportData): Promise<Buffer> {
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];
        
        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Generate PDF content
        this.buildPDFContent(doc, data);
        
        // Finalize the PDF
        doc.end();
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  private buildPDFContent(doc: typeof PDFDocument, data: ReportData): void {
    const { validation, supplier, partners } = data;
    const createdDate = validation.createdAt ? new Date(validation.createdAt).toLocaleDateString('pt-BR') : '';
    
    // Header
    doc.fontSize(20).text('Relatório de Validação de Fornecedor', { align: 'center' });
    doc.moveDown();
    
    // Company name
    doc.fontSize(16).text(supplier?.companyName || '', { align: 'center' });
    doc.fontSize(12).text(`CNPJ: ${supplier?.cnpj || ''}`, { align: 'center' });
    doc.text(`Data da Análise: ${createdDate}`, { align: 'center' });
    doc.moveDown();
    
    // Score and status
    doc.fontSize(24).fillColor(this.getScoreColorHex(validation.score))
       .text(`Score: ${validation.score}/100`, { align: 'center' });
    doc.fillColor('black').fontSize(14)
       .text(`Status: ${this.getStatusText(validation.status)}`, { align: 'center' });
    doc.moveDown(2);
    
    // Company information section
    this.addSection(doc, 'Informações Cadastrais');
    this.addTableRow(doc, 'Razão Social:', supplier?.companyName || '');
    this.addTableRow(doc, 'Nome Fantasia:', supplier?.tradeName || 'N/A');
    this.addTableRow(doc, 'Status Legal:', supplier?.legalStatus || '');
    this.addTableRow(doc, 'Situação:', supplier?.legalSituation || '');
    this.addTableRow(doc, 'Porte:', supplier?.companySize || '');
    this.addTableRow(doc, 'CNAE:', `${supplier?.cnaeCode || ''} - ${supplier?.cnaeDescription || ''}`);
    this.addTableRow(doc, 'Data de Abertura:', supplier?.openingDate ? new Date(supplier.openingDate).toLocaleDateString('pt-BR') : '');
    this.addTableRow(doc, 'Capital Social:', supplier?.shareCapital ? `R$ ${Number(supplier.shareCapital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00');
    doc.moveDown();
    
    // Corporate structure
    if (partners && partners.length > 0) {
      this.addSection(doc, 'Estrutura Societária');
      partners.forEach(partner => {
        this.addTableRow(doc, partner.name, partner.qualification || 'N/A');
      });
      doc.moveDown();
    }
    
    // Address information
    this.addSection(doc, 'Endereço');
    this.addTableRow(doc, 'Endereço:', supplier?.address || 'N/A');
    this.addTableRow(doc, 'Cidade:', supplier?.city || 'N/A');
    this.addTableRow(doc, 'Estado:', supplier?.state || 'N/A');
    this.addTableRow(doc, 'CEP:', supplier?.zipCode || 'N/A');
    this.addTableRow(doc, 'Telefone:', supplier?.phone || 'N/A');
    this.addTableRow(doc, 'Email:', supplier?.email || 'N/A');
    doc.moveDown();
    
    // Risk analysis
    this.addSection(doc, 'Análise de Risco');
    this.addTableRow(doc, 'Score Final:', `${validation.score}/100`);
    this.addTableRow(doc, 'Classificação:', this.getStatusText(validation.status));
    this.addTableRow(doc, 'Categoria:', validation.category || 'Geral');
    this.addTableRow(doc, 'Fonte dos Dados:', validation.dataSource || 'APIs Públicas');
    
    if (validation.processingTime) {
      this.addTableRow(doc, 'Tempo de Processamento:', `${validation.processingTime}ms`);
    }
    doc.moveDown();
    
    // Financial health
    if (validation.financialHealth) {
      this.addFinancialHealthPDF(doc, validation.financialHealth);
    }
    
    // Certificates
    if (validation.certificates) {
      this.addCertificatesPDF(doc, validation.certificates);
    }
    
    // Footer
    doc.moveDown();
    doc.fontSize(10).fillColor('gray')
       .text('Este relatório foi gerado automaticamente pelo sistema ValidaFornecedor.', { align: 'center' });
    doc.text('Os dados foram coletados de fontes públicas e APIs especializadas.', { align: 'center' });
    doc.text('Recomenda-se realizar nova validação periodicamente para manter as informações atualizadas.', { align: 'center' });
  }

  private addSection(doc: typeof PDFDocument, title: string): void {
    doc.fontSize(14).fillColor('black').text(title, { underline: true });
    doc.moveDown(0.5);
  }

  private addTableRow(doc: typeof PDFDocument, label: string, value: string): void {
    const y = doc.y;
    doc.fontSize(10).text(label, 50, y, { width: 150 });
    doc.text(value, 200, y, { width: 300 });
    doc.moveDown(0.3);
  }

  private addFinancialHealthPDF(doc: typeof PDFDocument, financialHealth: any): void {
    this.addSection(doc, 'Saúde Financeira');
    this.addTableRow(doc, 'Score Serasa:', financialHealth.serasaScore?.toString() || 'N/A');
    this.addTableRow(doc, 'Protestos:', financialHealth.protests?.length?.toString() || '0');
    this.addTableRow(doc, 'Falências:', financialHealth.bankruptcies?.length?.toString() || '0');
    this.addTableRow(doc, 'Recuperação Judicial:', financialHealth.judicialRecovery ? 'Sim' : 'Não');
    doc.moveDown();
  }

  private addCertificatesPDF(doc: typeof PDFDocument, certificates: any): void {
    this.addSection(doc, 'Regularidade Fiscal');
    if (certificates.federal) {
      this.addTableRow(doc, 'Federal:', `${certificates.federal.status} - ${certificates.federal.expiryDate ? new Date(certificates.federal.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}`);
    }
    if (certificates.state) {
      this.addTableRow(doc, 'Estadual:', `${certificates.state.status} - ${certificates.state.expiryDate ? new Date(certificates.state.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}`);
    }
    if (certificates.municipal) {
      this.addTableRow(doc, 'Municipal:', `${certificates.municipal.status} - ${certificates.municipal.expiryDate ? new Date(certificates.municipal.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}`);
    }
    if (certificates.labor) {
      this.addTableRow(doc, 'Trabalhista:', `${certificates.labor.status} - ${certificates.labor.expiryDate ? new Date(certificates.labor.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}`);
    }
    doc.moveDown();
  }

  private getScoreColorHex(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  }

  private generateHTMLReport(data: ReportData): string {
    const { validation, supplier, partners } = data;
    const createdDate = validation.createdAt?.toLocaleDateString('pt-BR') || '';
    
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Validação - ${supplier?.companyName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .score { font-size: 48px; font-weight: bold; color: ${this.getScoreColor(validation.score)}; }
            .section { margin-bottom: 20px; }
            .section h2 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status-approved { color: green; font-weight: bold; }
            .status-attention { color: orange; font-weight: bold; }
            .status-critical { color: red; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório de Validação de Fornecedor</h1>
            <h2>${supplier?.companyName || ''}</h2>
            <p>CNPJ: ${supplier?.cnpj || ''}</p>
            <p>Data da Análise: ${createdDate}</p>
            <div class="score">${validation.score}</div>
            <p class="status-${validation.status}">Status: ${validation.status.toUpperCase()}</p>
        </div>

        <div class="section">
            <h2>Informações Cadastrais</h2>
            <table>
                <tr><th>Razão Social</th><td>${supplier?.companyName || ''}</td></tr>
                <tr><th>Nome Fantasia</th><td>${supplier?.tradeName || 'N/A'}</td></tr>
                <tr><th>CNPJ</th><td>${supplier?.cnpj || ''}</td></tr>
                <tr><th>Status Legal</th><td>${supplier?.legalStatus || ''}</td></tr>
                <tr><th>Situação</th><td>${supplier?.legalSituation || ''}</td></tr>
                <tr><th>Porte</th><td>${supplier?.companySize || ''}</td></tr>
                <tr><th>Data de Abertura</th><td>${supplier?.openingDate ? new Date(supplier.openingDate).toLocaleDateString('pt-BR') : ''}</td></tr>
                <tr><th>Capital Social</th><td>R$ ${supplier?.shareCapital ? Number(supplier.shareCapital).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h2>Estrutura Societária</h2>
            <table>
                <tr><th>Nome</th><th>Qualificação</th><th>Participação</th></tr>
                ${partners.map(partner => `
                    <tr>
                        <td>${partner.name}</td>
                        <td>${partner.qualification || 'N/A'}</td>
                        <td>${partner.sharePercentage && Number(partner.sharePercentage) > 0 ? partner.sharePercentage : 'N/A'}</td>
                    </tr>
                `).join('')}
            </table>
        </div>

        <div class="section">
            <h2>Análise de Risco</h2>
            <table>
                <tr><th>Score de Risco</th><td><strong>${validation.score}/100</strong></td></tr>
                <tr><th>Classificação</th><td><strong class="status-${validation.status}">${this.getStatusText(validation.status)}</strong></td></tr>
                <tr><th>Categoria</th><td>${validation.category || 'Geral'}</td></tr>
                <tr><th>Fonte dos Dados</th><td>${validation.dataSource || 'APIs Públicas'}</td></tr>
                <tr><th>Tempo de Processamento</th><td>${validation.processingTime ? validation.processingTime + 'ms' : 'N/A'}</td></tr>
            </table>
        </div>

        ${this.generateFinancialHealthSection(validation.financialHealth)}
        ${this.generateCertificatesSection(validation.certificates)}
        ${this.generateLegalIssuesSection(validation.legalIssues)}
        ${this.generateRiskAnalysisSection(validation.riskAnalysis)}

        <div class="section">
            <h2>Endereço</h2>
            <table>
                <tr><th>Endereço</th><td>${supplier?.address || 'N/A'}</td></tr>
                <tr><th>Cidade</th><td>${supplier?.city || 'N/A'}</td></tr>
                <tr><th>Estado</th><td>${supplier?.state || 'N/A'}</td></tr>
                <tr><th>CEP</th><td>${supplier?.zipCode || 'N/A'}</td></tr>
                <tr><th>Telefone</th><td>${supplier?.phone || 'N/A'}</td></tr>
                <tr><th>Email</th><td>${supplier?.email || 'N/A'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h2>Observações</h2>
            <p>Este relatório foi gerado automaticamente pelo sistema ValidaFornecedor em ${createdDate}.</p>
            <p>Os dados foram coletados de fontes públicas e APIs especializadas.</p>
            <p>Recomenda-se realizar nova validação periodicamente para manter as informações atualizadas.</p>
            <p><strong>Importante:</strong> Este relatório é baseado em dados públicos e deve ser usado como referência inicial. Para decisões críticas, recomenda-se análise adicional.</p>
        </div>
    </body>
    </html>
    `;
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  }

  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'approved': 'APROVADO',
      'attention': 'ATENÇÃO',
      'critical': 'CRÍTICO',
    };
    return statusMap[status] || status.toUpperCase();
  }

  private generateFinancialHealthSection(financialHealth: any): string {
    if (!financialHealth) return '';
    
    return `
        <div class="section">
            <h2>Saúde Financeira</h2>
            <table>
                <tr><th>Score Serasa</th><td>${financialHealth.serasaScore || 'N/A'}</td></tr>
                <tr><th>Protestos</th><td>${financialHealth.protests?.length || 0}</td></tr>
                <tr><th>Falências</th><td>${financialHealth.bankruptcies?.length || 0}</td></tr>
                <tr><th>Recuperação Judicial</th><td>${financialHealth.judicialRecovery ? 'Sim' : 'Não'}</td></tr>
            </table>
        </div>
    `;
  }

  private generateCertificatesSection(certificates: any): string {
    if (!certificates) return '';
    
    return `
        <div class="section">
            <h2>Regularidade Fiscal</h2>
            <table>
                <tr><th>Certificado</th><th>Status</th><th>Validade</th></tr>
                <tr><td>Federal</td><td>${certificates.federal?.status || 'N/A'}</td><td>${certificates.federal?.expiryDate ? new Date(certificates.federal.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}</td></tr>
                <tr><td>Estadual</td><td>${certificates.state?.status || 'N/A'}</td><td>${certificates.state?.expiryDate ? new Date(certificates.state.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}</td></tr>
                <tr><td>Municipal</td><td>${certificates.municipal?.status || 'N/A'}</td><td>${certificates.municipal?.expiryDate ? new Date(certificates.municipal.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}</td></tr>
                <tr><td>Trabalhista</td><td>${certificates.labor?.status || 'N/A'}</td><td>${certificates.labor?.expiryDate ? new Date(certificates.labor.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}</td></tr>
            </table>
        </div>
    `;
  }

  private generateLegalIssuesSection(legalIssues: any): string {
    if (!legalIssues) return '';
    
    return `
        <div class="section">
            <h2>Questões Legais</h2>
            <table>
                <tr><th>Processos Judiciais</th><td>${legalIssues.processes?.length || 0}</td></tr>
                <tr><th>Sanções</th><td>${legalIssues.sanctions?.length || 0}</td></tr>
                <tr><th>Restrições</th><td>${legalIssues.restrictions?.length || 0}</td></tr>
            </table>
        </div>
    `;
  }

  private generateRiskAnalysisSection(riskAnalysis: any): string {
    if (!riskAnalysis) return '';
    
    return `
        <div class="section">
            <h2>Detalhes da Análise de Risco</h2>
            <table>
                <tr><th>Aspecto</th><th>Score</th><th>Peso</th><th>Contribuição</th></tr>
                ${Object.entries(riskAnalysis.details || {}).map(([key, detail]: [string, any]) => `
                    <tr>
                        <td>${this.translateRiskAspect(key)}</td>
                        <td>${detail.score}/10</td>
                        <td>${detail.weight}%</td>
                        <td>${detail.contribution}</td>
                    </tr>
                `).join('')}
            </table>
            ${riskAnalysis.recommendations?.length ? `
                <h3>Recomendações</h3>
                <ul>
                    ${riskAnalysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `;
  }

  private translateRiskAspect(aspect: string): string {
    const translations: { [key: string]: string } = {
      'legalCompliance': 'Conformidade Legal',
      'financialStability': 'Estabilidade Financeira',
      'operationalRisk': 'Risco Operacional',
      'documentationCompliance': 'Documentação',
      'businessAge': 'Tempo de Atividade',
      'companySize': 'Porte da Empresa',
    };
    return translations[aspect] || aspect;
  }

  generateExcelReport(validations: any[]): Buffer {
    // This would implement Excel generation using libraries like ExcelJS
    // For now, return a CSV format as a simple implementation
    
    const headers = [
      'Data',
      'Empresa',
      'CNPJ',
      'Score',
      'Status',
      'Categoria'
    ];

    const rows = validations.map(v => [
      v.validation.createdAt?.toLocaleDateString('pt-BR') || '',
      v.supplier?.companyName || '',
      v.supplier?.cnpj || '',
      v.validation.score,
      v.validation.status,
      v.validation.category || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }
}

export { ReportService };
export const reportService = new ReportService();
