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
 * Export business cards to Excel format using ExcelJS (more secure)
 */
export async function exportToExcel(cards: BusinessCard[]): Promise<Blob> {
  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // メタデータ設定
    workbook.creator = 'Business Card Manager';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // ワークシート作成
    const worksheet = workbook.addWorksheet('名刺リスト', {
      properties: { tabColor: { argb: '0066CC' } }
    });
    
    // カラム定義
    worksheet.columns = [
      { header: '名前', key: 'name', width: 20 },
      { header: '会社名', key: 'company', width: 30 },
      { header: '役職', key: 'title', width: 20 },
      { header: 'メールアドレス', key: 'email', width: 30 },
      { header: '電話番号', key: 'phone', width: 20 },
      { header: 'URL', key: 'url', width: 40 },
      { header: 'LINE ID', key: 'line', width: 20 },
      { header: '事業内容', key: 'business', width: 40 },
      { header: 'タグ', key: 'tags', width: 30 },
      { header: '交換日', key: 'exchangeDate', width: 15 },
      { header: 'メモ', key: 'notes', width: 40 },
      { header: '作成日', key: 'createdAt', width: 20 },
      { header: '更新日', key: 'updatedAt', width: 20 }
    ];
    
    // ヘッダースタイル設定
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0066CC' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // データ追加
    cards.forEach(card => {
      worksheet.addRow({
        name: card.name,
        company: card.companyName,
        title: card.title || '',
        email: card.emails.join('; '),
        phone: card.phones.join('; '),
        url: card.urls.join('; '),
        line: card.line_ids.join('; '),
        business: card.businessContent || '',
        tags: (card.tags || []).join('; '),
        exchangeDate: card.exchangeDate || '',
        notes: card.notes || '',
        createdAt: card.createdAt || '',
        updatedAt: card.updatedAt || ''
      });
    });
    
    // ボーダー追加
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // バッファに書き込み
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
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