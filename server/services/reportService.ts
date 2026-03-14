import { Validation, Supplier, Partner } from "@shared/schema";
import PDFDocument from 'pdfkit';

interface ReportData {
  validation: Validation;
  supplier: Supplier | null;
  partners: Partner[];
}

class ReportService {
  async generatePDF(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        try {
          this.buildPDFContent(doc, data);
        } catch (contentError) {
          console.error('Error building PDF content:', contentError);
        }

        doc.end();
      } catch (error) {
        console.error('Error generating PDF:', error);
        reject(new Error('Failed to generate PDF report'));
      }
    });
  }

  async generateConsolidatedPDF(records: ReportData[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ bufferPages: true, margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        try {
          const now = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });

          // ─── COVER PAGE ────────────────────────────────────────────────
          doc.rect(0, 0, 612, 792).fill('#111827');

          doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
            .text('FORNECEDOR FLOW', 50, 200, { align: 'center', width: 512 });

          doc.fontSize(16).font('Helvetica')
            .text('Relatório Consolidado de Fornecedores', 50, 245, { align: 'center', width: 512 });

          doc.moveTo(150, 280).lineTo(462, 280).stroke('#4B5563');

          doc.fontSize(11).fillColor('#9CA3AF')
            .text(`Gerado em ${now}`, 50, 295, { align: 'center', width: 512 });

          // Stats on cover
          const total = records.length;
          const approved = records.filter(r => r.validation.status === 'approved').length;
          const attention = records.filter(r => r.validation.status === 'attention').length;
          const rejected = records.filter(r => r.validation.status === 'rejected').length;
          const avgScore = total > 0
            ? Math.round(records.reduce((s, r) => s + r.validation.score, 0) / total)
            : 0;

          const statsY = 360;
          const statItems = [
            { label: 'Total', value: total.toString(), color: '#FFFFFF' },
            { label: 'Aprovados', value: approved.toString(), color: '#22c55e' },
            { label: 'Atenção', value: attention.toString(), color: '#f59e0b' },
            { label: 'Reprovados', value: rejected.toString(), color: '#ef4444' },
            { label: 'Score Médio', value: avgScore.toString(), color: '#60a5fa' },
          ];

          statItems.forEach((item, idx) => {
            const x = 76 + idx * 96;
            doc.fillColor(item.color).fontSize(28).font('Helvetica-Bold')
              .text(item.value, x, statsY, { width: 76, align: 'center' });
            doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica')
              .text(item.label, x, statsY + 38, { width: 76, align: 'center' });
          });

          doc.fillColor('#374151').fontSize(10)
            .text('Este documento contém a análise consolidada de todos os fornecedores validados.',
              50, 480, { align: 'center', width: 512 });
          doc.text('Cada fornecedor é apresentado com score de risco, dados cadastrais e análise detalhada.',
            50, 498, { align: 'center', width: 512 });

          // ─── ONE PAGE PER SUPPLIER ─────────────────────────────────────
          for (const record of records) {
            doc.addPage();
            this.buildPDFContent(doc, record);
          }

        } catch (contentError) {
          console.error('Error building consolidated PDF content:', contentError);
        }

        doc.end();
      } catch (error) {
        console.error('Error generating consolidated PDF:', error);
        reject(new Error('Failed to generate consolidated PDF report'));
      }
    });
  }

  private buildPDFContent(doc: typeof PDFDocument, data: ReportData): void {
    const { validation, supplier, partners } = data;
    const createdDate = validation.createdAt ? new Date(validation.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const scoreColor = this.getScoreColorHex(validation.score);

    // --- Header ---
    doc.rect(0, 0, 612, 70).fill('#111827');
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('FORNECEDOR FLOW', 50, 25);
    doc.fontSize(10).font('Helvetica').text('Relatório de Auditoria Digital', 50, 45);
    doc.fontSize(10).text(`Gerado em ${createdDate}`, 430, 35, { align: 'right' });

    doc.moveDown(4);

    // --- Summary Section (Score Card) ---
    const startY = doc.y;
    doc.rect(50, startY, 512, 120).fill('#F9FAFB').stroke('#E5E7EB');

    // Left side: Score
    doc.fillColor(scoreColor).fontSize(48).font('Helvetica-Bold').text(validation.score.toString(), 90, startY + 25);
    doc.fontSize(12).fillColor('#6B7280').font('Helvetica').text('Score Total', 90, startY + 80);

    // Divider
    doc.moveTo(180, startY + 20).lineTo(180, startY + 100).stroke('#E5E7EB');

    // Right side: Company Name & Status
    doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(supplier?.companyName || 'N/A', 200, startY + 30, { width: 340 });
    doc.fontSize(12).fillColor(scoreColor).text(`${this.getStatusText(validation.status)}`, 200, startY + 75);

    doc.moveDown(7);

    // --- Main Data Sections ---

    // 1. Informações Cadastrais
    this.addSection(doc, 'Informações Cadastrais');
    doc.moveDown(0.2);
    this.addTableRow(doc, 'Razão Social:', supplier?.companyName || 'N/A');
    this.addTableRow(doc, 'Nome Fantasia:', supplier?.tradeName || 'N/A');
    this.addTableRow(doc, 'CNPJ:', supplier?.cnpj || 'N/A');
    this.addTableRow(doc, 'Situação Cadastral:', supplier?.legalSituation || 'N/A');
    this.addTableRow(doc, 'Data de Abertura:', supplier?.openingDate ? new Date(supplier.openingDate).toLocaleDateString('pt-BR') : 'N/A');
    this.addTableRow(doc, 'Porte:', supplier?.companySize || 'N/A');
    this.addTableRow(doc, 'CNAE Principal:', `${supplier?.cnaeCode || ''} - ${supplier?.cnaeDescription || ''}`);
    this.addTableRow(doc, 'Capital Social:', supplier?.shareCapital ? `R$ ${Number(supplier.shareCapital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00');

    // 2. Estrutura Societária (deduplicated by name)
    const uniquePartners = partners
      ? partners.filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx)
      : [];
    if (uniquePartners.length > 0) {
      doc.moveDown(1);
      this.addSection(doc, 'Estrutura Societária');
      doc.moveDown(0.2);
      uniquePartners.forEach(partner => {
        const share = partner.sharePercentage && Number(partner.sharePercentage) > 0 ? ` (${partner.sharePercentage}%)` : '';
        this.addTableRow(doc, partner.name, `${partner.qualification || 'Sócio'}${share}`);
      });
    }

    // 3. Localização e Contato
    doc.moveDown(1);
    this.addSection(doc, 'Localização e Contato');
    doc.moveDown(0.2);
    this.addTableRow(doc, 'Endereço:', supplier?.address || 'N/A');
    this.addTableRow(doc, 'Cidade/UF:', `${supplier?.city || 'N/A'} - ${supplier?.state || 'N/A'}`);
    this.addTableRow(doc, 'Telefone:', supplier?.phone || 'N/A');
    this.addTableRow(doc, 'E-mail:', supplier?.email || 'N/A');

    // Check if we need a new page for detailed analysis
    if (doc.y > 550) doc.addPage();

    // 4. Análise de Saúde Financeira
    doc.moveDown(1);
    this.addSection(doc, 'Saúde Financeira');
    doc.moveDown(0.2);
    if (validation.financialHealth) {
      const fh = validation.financialHealth as any;
      this.addTableRow(doc, 'Score de Crédito Estimado:', fh.serasaScore?.toString() || 'Pendente');
      this.addTableRow(doc, 'Pendências Financeiras:', fh.protests?.length > 0 ? `${fh.protests.length} Registro(s)` : 'Nenhuma');
      this.addTableRow(doc, 'Ocorrências de Falência:', fh.bankruptcies?.length > 0 ? `${fh.bankruptcies.length} Registro(s)` : 'Nenhuma');
      this.addTableRow(doc, 'Recuperação Judicial:', fh.judicialRecovery ? 'Identificado' : 'Não Consta');
    } else {
      doc.fontSize(10).fillColor('#6B7280').text('Dados financeiros não disponíveis no momento.');
    }

    // 5. Regularidade Fiscal (Certidões)
    doc.moveDown(1);
    this.addSection(doc, 'Regularidade Fiscal');
    doc.moveDown(0.2);
    if (validation.certificates) {
      const certs = validation.certificates as any;
      const formatCert = (c: any) => {
        if (!c) return 'Pendente';
        const status = c.status === 'valid' ? 'Regular' : c.status;
        return `${status} (Validade: ${c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('pt-BR') : 'N/A'})`;
      };

      this.addTableRow(doc, 'Tributos Federais:', formatCert(certs.federal));
      this.addTableRow(doc, 'Tributos Estaduais:', formatCert(certs.state));
      this.addTableRow(doc, 'Tributos Municipais:', formatCert(certs.municipal));
      this.addTableRow(doc, 'Débitos Trabalhistas (CNDT):', formatCert(certs.labor));
    }

    // 6. Análise de Risco
    const riskData = (validation.riskAnalysis as any) || null;
    doc.moveDown(1);
    this.addSection(doc, 'Análise de Risco e Compliance');
    doc.moveDown(0.2);

    if (riskData) {
      // Score + Level row
      const scoreLabel = `Score de Compliance: ${riskData.complianceScore ?? 'N/A'}/100`;
      const riskLevel = riskData.riskLevel || 'N/A';
      if (doc.y > 720) doc.addPage();
      const riskY = doc.y;
      doc.rect(65, riskY, 480, 20).fill('#F3F4F6');
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold')
        .text(scoreLabel, 70, riskY + 4, { width: 240 });
      doc.fillColor(this.getRiskLevelColor(riskLevel)).fontSize(10).font('Helvetica-Bold')
        .text(`Nível: ${riskLevel}`, 310, riskY + 4, { width: 220, align: 'right' });
      doc.y = riskY + 26;

      // Compliance checks
      const checks = (riskData.complianceChecks as any) || {};
      const checkItems = [
        { label: 'CEIS (Inidôneas/Suspensas)', value: checks.ceis ? '⚠ ENCONTRADO' : 'Limpo', bad: !!checks.ceis },
        { label: 'CNEP (Empresas Punidas)', value: checks.cnep ? '⚠ ENCONTRADO' : 'Limpo', bad: !!checks.cnep },
        { label: 'Lista de Sanções (CGU)', value: checks.sanctionList ? '⚠ ENCONTRADO' : 'Limpo', bad: !!checks.sanctionList },
        { label: 'Trabalho Escravo (MTE)', value: checks.workSlavery ? '⚠ ENCONTRADO' : 'Limpo', bad: !!checks.workSlavery },
        { label: 'Pessoa Politicamente Exposta', value: checks.pep ? 'SIM' : 'Não', bad: !!checks.pep },
      ];
      checkItems.forEach(item => {
        if (doc.y > 720) doc.addPage();
        const cy = doc.y;
        doc.fillColor('#6B7280').fontSize(9).font('Helvetica').text(item.label, 65, cy, { width: 300 });
        doc.fillColor(item.bad ? '#ef4444' : '#22c55e').fontSize(9).font('Helvetica-Bold')
          .text(item.value, 370, cy, { width: 175, align: 'right' });
        doc.y = cy + 14;
      });

      // Risk factors
      const factors: string[] = riskData.riskFactors || [];
      if (factors.length > 0) {
        doc.moveDown(0.5);
        if (doc.y > 720) doc.addPage();
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text('Fatores de Risco Identificados:', 65);
        doc.moveDown(0.2);
        factors.forEach((f: string) => {
          if (doc.y > 720) doc.addPage();
          doc.fillColor('#92400e').fontSize(9).font('Helvetica').text(`• ${f}`, 75, doc.y, { width: 460 });
          doc.y = doc.y + 13;
        });
      }

      // Recommendations
      const recs: string[] = riskData.recommendations || [];
      if (recs.length > 0) {
        doc.moveDown(0.5);
        if (doc.y > 720) doc.addPage();
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text('Recomendações:', 65);
        doc.moveDown(0.2);
        recs.forEach((r: string) => {
          if (doc.y > 720) doc.addPage();
          doc.fillColor('#1d4ed8').fontSize(9).font('Helvetica').text(`• ${r}`, 75, doc.y, { width: 460 });
          doc.y = doc.y + 13;
        });
      }

      // Data sources
      doc.moveDown(0.4);
      const sources = (riskData.dataSourcers as string[]) || [];
      if (sources.length > 0) {
        doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
          .text(`Fontes: ${sources.join(', ')}`, 65, doc.y, { width: 480 });
        doc.y = doc.y + 12;
      }
    } else {
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica')
        .text('Análise de risco não disponível para esta consulta.', 65);
      doc.y = doc.y + 14;
    }

    // 7. Informações de Mercado (B3)
    const marketData = (validation.financialMarketData as any) || null;
    doc.moveDown(1);
    this.addSection(doc, 'Informações de Mercado (B3)');
    doc.moveDown(0.2);
    this.addTableRow(doc, 'Ticker:', marketData?.ticker || 'N/D');
    this.addTableRow(doc, 'Preço da Ação:', marketData?.price ? `${marketData.currency || 'BRL'} ${Number(marketData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D');
    this.addTableRow(doc, 'Valuation (Market Cap):', marketData?.marketCap ? `${marketData.currency || 'BRL'} ${Number(marketData.marketCap).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 2 })}` : 'N/D');
    this.addTableRow(doc, 'Fonte:', marketData?.source ? `${marketData.source} (Atualizado em: ${marketData.updatedAt ? new Date(marketData.updatedAt).toLocaleDateString('pt-BR') : 'N/A'})` : 'B3 / HG Brasil / Brapi (Empresa sem capital aberto)');


    // Footer note on last page
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9CA3AF').font('Helvetica')
      .text('Fornecedor Flow - Tecnologia de Gestão de Risco e Compliance', { align: 'center' });
    doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
  }

  private addSection(doc: typeof PDFDocument, title: string): void {
    const y = doc.y;
    doc.rect(50, y, 5, 14).fill('#2563EB'); // Blue accent
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(title, 65, y);
    doc.moveTo(50, y + 16).lineTo(562, y + 16).stroke('#E5E7EB');
    doc.moveDown(0.5);
  }

  private addTableRow(doc: typeof PDFDocument, label: string, value: string): void {
    const LINE_HEIGHT = 11;  // px per line at fontSize 9
    const LABEL_WIDTH = 140;
    const VALUE_WIDTH = 350;
    const PADDING = 4;

    // Estimate number of lines needed for each column
    const avgCharWidth = 5; // rough estimate at 9pt Helvetica
    const labelLines = Math.max(1, Math.ceil((label.length * avgCharWidth) / LABEL_WIDTH));
    const valueLines = Math.max(1, Math.ceil((value.length * avgCharWidth) / VALUE_WIDTH));
    const rowHeight = Math.max(labelLines, valueLines) * LINE_HEIGHT + PADDING;

    // If not enough space on the page, add a new page
    if (doc.y + rowHeight > 730) doc.addPage();

    const rowY = doc.y;
    doc.fillColor('#6B7280').fontSize(9).font('Helvetica')
      .text(label, 65, rowY, { width: LABEL_WIDTH, lineGap: 1 });
    doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold')
      .text(value, 210, rowY, { width: VALUE_WIDTH, lineGap: 1 });

    // Move to the position AFTER the tallest column + padding
    doc.y = rowY + rowHeight;
  }

  private getScoreColorHex(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  }

  private getRiskLevelColor(level: string): string {
    if (level === 'BAIXO') return '#22c55e';
    if (level === 'MÉDIO') return '#f59e0b';
    if (level === 'ALTO') return '#ef4444';
    return '#dc2626'; // CRÍTICO
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
                ${(() => {
        const uniquePartners = partners.reduce((acc: any[], current: any) => {
          const exists = acc.find((p: any) => p.name === current.name);
          if (!exists) acc.push(current);
          else {
            const existingIndex = acc.findIndex((p: any) => p.name === current.name);
            const hasMoreInfo =
              (current.cpfCnpj && !exists.cpfCnpj) ||
              (current.sharePercentage > 0 && !exists.sharePercentage) ||
              (/\\d/.test(current.qualification || '') && !/\\d/.test(exists.qualification || ''));
            if (hasMoreInfo) acc[existingIndex] = current;
          }
          return acc;
        }, []);
        return uniquePartners.map((partner: any) => `
                    <tr>
                        <td>${partner.name}</td>
                        <td>${partner.qualification || 'N/A'}</td>
                        <td>${partner.sharePercentage && Number(partner.sharePercentage) > 0 ? partner.sharePercentage : 'N/A'}</td>
                    </tr>
                  `).join('');
      })()}
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
