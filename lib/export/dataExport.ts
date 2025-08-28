/**
 * Data Export and Backup utilities
 */
import { BusinessCard } from '@/types';

/**
 * Export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  VCARD = 'vcard'
}

/**
 * Export business cards to JSON format
 */
export function exportToJSON(cards: BusinessCard[]): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalCards: cards.length,
    cards: cards.map(card => ({
      ...card,
      // Remove base64 images from export to reduce size
      frontImageBase64: card.frontImageBase64 ? '[IMAGE_DATA]' : undefined,
      backImageBase64: card.backImageBase64 ? '[IMAGE_DATA]' : undefined,
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export business cards to CSV format
 */
export function exportToCSV(cards: BusinessCard[]): string {
  if (cards.length === 0) return '';
  
  // Define CSV headers
  const headers = [
    '名前',
    '会社名',
    '役職',
    'メールアドレス',
    '電話番号',
    'URL',
    'LINE ID',
    '事業内容',
    'タグ',
    '交換日',
    'メモ',
    '作成日',
    '更新日'
  ];
  
  // Convert cards to CSV rows
  const rows = cards.map(card => [
    card.name,
    card.companyName,
    card.title || '',
    card.emails.join('; '),
    card.phones.join('; '),
    card.urls.join('; '),
    card.line_ids.join('; '),
    (card.businessContent || '').replace(/\n/g, ' ').replace(/"/g, '""'),
    (card.tags || []).join('; '),
    card.exchangeDate || '',
    (card.notes || '').replace(/\n/g, ' ').replace(/"/g, '""'),
    card.createdAt || '',
    card.updatedAt || ''
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Add BOM for Excel compatibility
  return '\uFEFF' + csvContent;
}

/**
 * Export business cards to vCard format
 */
export function exportToVCard(cards: BusinessCard[]): string {
  return cards.map(card => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${card.name}`,
      `N:${card.name};;;`,
      `ORG:${card.companyName}`,
      card.title ? `TITLE:${card.title}` : null,
      ...card.emails.map(email => `EMAIL:${email}`),
      ...card.phones.map(phone => `TEL:${phone}`),
      ...card.urls.map(url => `URL:${url}`),
      card.notes ? `NOTE:${card.notes.replace(/\n/g, '\\n')}` : null,
      'END:VCARD'
    ].filter(Boolean);
    
    return vcard.join('\r\n');
  }).join('\r\n\r\n');
}

/**
 * Export business cards to Excel format (simplified XLSX)
 */
export async function exportToExcel(cards: BusinessCard[]): Promise<Blob> {
  // Dynamic import of xlsx library (optional dependency)
  try {
    // @ts-expect-error - Optional dependency
    const XLSX = await import('xlsx');
    
    // Prepare data for Excel
    const worksheetData = cards.map(card => ({
      '名前': card.name,
      '会社名': card.companyName,
      '役職': card.title || '',
      'メールアドレス': card.emails.join('; '),
      '電話番号': card.phones.join('; '),
      'URL': card.urls.join('; '),
      'LINE ID': card.line_ids.join('; '),
      '事業内容': card.businessContent || '',
      'タグ': (card.tags || []).join('; '),
      '交換日': card.exchangeDate || '',
      'メモ': card.notes || '',
      '作成日': card.createdAt || '',
      '更新日': card.updatedAt || ''
    }));
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '名刺リスト');
    
    // Set column widths
    const maxWidths = Object.keys(worksheetData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...worksheetData.map(row => String(row[key as keyof typeof row] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = maxWidths;
    
    // Write to buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Excel形式のエクスポートに失敗しました。CSVフォーマットをお試しください。');
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFileName(format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = format === ExportFormat.EXCEL ? 'xlsx' : format;
  return `business-cards-export-${timestamp}.${extension}`;
}

/**
 * Download file to user's device
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export cards with selected format
 */
export async function exportCards(
  cards: BusinessCard[],
  format: ExportFormat
): Promise<void> {
  try {
    let content: string | Blob;
    let mimeType: string;
    
    switch (format) {
      case ExportFormat.JSON:
        content = exportToJSON(cards);
        mimeType = 'application/json';
        break;
        
      case ExportFormat.CSV:
        content = exportToCSV(cards);
        mimeType = 'text/csv;charset=utf-8';
        break;
        
      case ExportFormat.VCARD:
        content = exportToVCard(cards);
        mimeType = 'text/vcard';
        break;
        
      case ExportFormat.EXCEL:
        content = await exportToExcel(cards);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
        
      default:
        throw new Error('サポートされていない形式です');
    }
    
    const filename = generateFileName(format);
    downloadFile(content, filename, mimeType);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Import cards from JSON
 */
export function importFromJSON(jsonString: string): BusinessCard[] {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.cards || !Array.isArray(data.cards)) {
      throw new Error('無効なJSONフォーマットです');
    }
    
    // Remove images and validate each card
    return data.cards.map((card: any) => ({
      name: card.name || '',
      companyName: card.companyName || '',
      title: card.title || '',
      urls: Array.isArray(card.urls) ? card.urls : [],
      emails: Array.isArray(card.emails) ? card.emails : [],
      phones: Array.isArray(card.phones) ? card.phones : [],
      line_ids: Array.isArray(card.line_ids) ? card.line_ids : [],
      businessContent: card.businessContent || '',
      exchangeDate: card.exchangeDate || '',
      notes: card.notes || '',
      tags: Array.isArray(card.tags) ? card.tags : [],
      // Don't import base64 images
      frontImageBase64: undefined,
      backImageBase64: undefined
    }));
  } catch (error) {
    throw new Error('JSONの解析に失敗しました');
  }
}

/**
 * Create backup of all data
 */
export async function createBackup(cards: BusinessCard[]): Promise<Blob> {
  const backup = {
    version: '1.0',
    backupDate: new Date().toISOString(),
    metadata: {
      totalCards: cards.length,
      hasImages: cards.some(card => card.frontImageBase64 || card.backImageBase64)
    },
    data: {
      cards: cards
    }
  };
  
  const jsonString = JSON.stringify(backup, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}