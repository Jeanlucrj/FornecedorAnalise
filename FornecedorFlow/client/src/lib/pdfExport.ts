import { apiRequest } from "./queryClient";

/**
 * Downloads a PDF report for a validation
 */
export async function downloadPDF(validationId: string, companyName: string): Promise<void> {
  try {
    const response = await fetch(`/api/validations/${validationId}/export`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `relatorio-${companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${date}.pdf`;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF report');
  }
}

/**
 * Exports multiple validations as Excel/CSV
 */
export async function exportValidations(
  filters: any = {},
  format: 'excel' | 'csv' = 'excel'
): Promise<void> {
  try {
    const queryParams = new URLSearchParams({
      format,
      ...filters,
    }).toString();

    const response = await fetch(`/api/validations/export?${queryParams}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    const filename = `validacoes-${date}.${extension}`;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting validations:', error);
    throw new Error('Failed to export validations');
  }
}

/**
 * Generates a shareable link for a validation report
 */
export async function generateShareableLink(validationId: string): Promise<string> {
  try {
    const response = await apiRequest('POST', `/api/validations/${validationId}/share`, {});
    const data = await response.json();
    return data.shareUrl;
  } catch (error) {
    console.error('Error generating shareable link:', error);
    throw new Error('Failed to generate shareable link');
  }
}

/**
 * Prints a validation report
 */
export function printValidationReport(validationId: string): void {
  const printWindow = window.open(`/api/validations/${validationId}/print`, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    throw new Error('Failed to open print window');
  }
}
