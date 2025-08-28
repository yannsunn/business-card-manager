/**
 * Export Dialog Component
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, FileJson, FileText, FileSpreadsheet, Users, Archive } from 'lucide-react';
import { BusinessCard } from '@/types';
import { exportCards, ExportFormat, createBackup } from '@/lib/export/dataExport';
import { useFocusTrap, useAnnounce } from '@/hooks/useAccessibility';

interface ExportDialogProps {
  cards: BusinessCard[];
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ cards, isOpen, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.JSON);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useFocusTrap(isOpen);
  const { announce } = useAnnounce();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      await exportCards(cards, selectedFormat);
      
      announce('エクスポートが完了しました', 'assertive');
      
      // Close dialog after successful export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackup = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      const backup = await createBackup(cards);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `business-cards-backup-${timestamp}.json`;
      
      const url = URL.createObjectURL(backup);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'バックアップの作成に失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      format: ExportFormat.JSON,
      icon: FileJson,
      title: 'JSON',
      description: 'プログラム間でのデータ交換に最適',
      color: 'text-yellow-400'
    },
    {
      format: ExportFormat.CSV,
      icon: FileText,
      title: 'CSV',
      description: 'Excel等の表計算ソフトで開けます',
      color: 'text-green-400'
    },
    {
      format: ExportFormat.VCARD,
      icon: Users,
      title: 'vCard',
      description: '連絡先アプリにインポート可能',
      color: 'text-blue-400'
    },
    {
      format: ExportFormat.EXCEL,
      icon: FileSpreadsheet,
      title: 'Excel',
      description: 'Microsoft Excelで直接開けます',
      color: 'text-green-600'
    }
  ];

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div 
        ref={containerRef}
        className="bg-gray-800 rounded-lg max-w-md w-full p-6"
        role="document"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="export-dialog-title" className="text-xl font-bold text-white">データエクスポート</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="ダイアログを閉じる"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            {cards.length}件の名刺データをエクスポートします
          </p>

          <div className="space-y-2">
            {exportOptions.map(option => (
              <button
                key={option.format}
                onClick={() => setSelectedFormat(option.format)}
                className={`w-full p-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedFormat === option.format
                    ? 'bg-gray-700 border-blue-500'
                    : 'bg-gray-900 border-gray-700 hover:bg-gray-700'
                }`}
                role="radio"
                aria-checked={selectedFormat === option.format}
                aria-label={`${option.title}: ${option.description}`}
              >
                <div className="flex items-center gap-3">
                  <option.icon className={`${option.color}`} size={24} />
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{option.title}</p>
                    <p className="text-gray-400 text-sm">{option.description}</p>
                  </div>
                  {selectedFormat === option.format && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleBackup}
            disabled={isExporting}
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="完全バックアップを作成"
            aria-busy={isExporting}
          >
            <Archive size={18} />
            完全バックアップ
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`${selectedFormat}形式でエクスポート`}
            aria-busy={isExporting}
          >
            <Download size={18} className={isExporting ? 'animate-bounce' : ''} />
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-4 text-center">
          ※ 画像データは含まれません（ファイルサイズ削減のため）
        </p>
      </div>
    </div>
  );
}