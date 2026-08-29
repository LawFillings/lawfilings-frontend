import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function postExtraction<T>(path: string, text: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/copilot/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export interface FirExtraction {
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  firNumber: string;
  policeStation: string;
  bnsSections: string;
  firFacts: string;
}

export function extractFirFromText(text: string, token: string): Promise<FirExtraction> {
  return postExtraction('extract-fir', text, token);
}

export interface LegalNoticeSourceExtraction {
  recipientName: string;
  recipientAddress: string;
  subject: string;
  factsNarrative: string;
  demandAction: string;
}

export function extractLegalNoticeSourceFromText(text: string, token: string): Promise<LegalNoticeSourceExtraction> {
  return postExtraction('extract-legal-notice-source', text, token);
}

export interface OaLoanRecallExtraction {
  loanAgreementPlace: string;
  loanAgreementNo1: string;
  loanAgreementDate1: string;
  defaultDate1: string;
  loanRecallNoticePlace: string;
  loanRecallNoticeDate: string;
  principalAmount: string;
  interestRate: string;
  interestAmount: string;
  totalAmount: string;
  calculationDate: string;
  loanAmount: string;
  sanctionDate: string;
  securityDescription: string;
  npaDate: string;
  propertyDetails: string;
  factsNarrative: string;
  defendantName: string;
  defendantAddress: string;
  defendantType: string;
}

export function extractOaLoanRecallFromText(text: string, token: string): Promise<OaLoanRecallExtraction> {
  return postExtraction('extract-oa-loan-recall', text, token);
}
