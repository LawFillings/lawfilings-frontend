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

export interface AppealOrderExtraction {
  orderDate: string;
  appellantName: string;
  respondentName: string;
  appellantAge: string;
  appellantAddress: string;
}

export function extractAppealOrderFromText(text: string, token: string): Promise<AppealOrderExtraction> {
  return postExtraction('extract-appeal-order', text, token);
}

export interface TribunalOrderExtraction {
  orderDate: string;
  applicantName: string;
  respondentName: string;
  caseNumber: string;
}

export function extractTribunalOrderFromText(text: string, token: string): Promise<TribunalOrderExtraction> {
  return postExtraction('extract-tribunal-order', text, token);
}

export interface OaExtraction {
  bankName: string;
  oaNumber: string;
  defendantName: string;
  defendantAge: string;
  defendantAddress: string;
  allegations: string[];
}

export function extractOaFromText(text: string, token: string): Promise<OaExtraction> {
  return postExtraction('extract-oa', text, token);
}

export interface ConsumerComplaintExtraction {
  complainantName: string;
  oppositePartyName: string;
  complaintNumber: string;
}

export function extractConsumerComplaintFromText(text: string, token: string): Promise<ConsumerComplaintExtraction> {
  return postExtraction('extract-consumer-complaint', text, token);
}
