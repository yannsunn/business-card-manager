export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // 使用可能な変数リスト
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailRecipient {
  cardId: string;
  email: string;
  name: string;
  company: string;
  selected: boolean;
  sentAt?: Date;
  status?: 'pending' | 'sent' | 'failed' | 'skipped';
}

export interface EmailCampaign {
  id: string;
  templateId: string;
  recipients: EmailRecipient[];
  sentAt?: Date;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  successCount: number;
  failureCount: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  companyName: string;
  companyTitle?: string;
  signature?: string;
}