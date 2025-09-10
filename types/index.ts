export interface BusinessCard {
  id?: string;
  name: string;
  companyName: string;
  title?: string;
  urls: string[];
  emails: string[];
  phones: string[];
  line_ids: string[];
  businessContent?: string;
  exchangeDate?: string;
  notes?: string;
  frontImageBase64?: string;
  backImageBase64?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}