
export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  password?: string;
}

export interface WoundReport {
  id: string;
  patientName: string;
  roomNo: string;
  dateOfDiscovery: string;
  facHosp: string;
  typeStage: string;
  isNoStage: boolean;
  site: string;
  colorDrainage: string;
  undermining: string;
  week1: string;
  week2: string;
  week3: string;
  week4: string;
  currentTreatment: string;
  comment: string;
  createdAt: number;
}

export type NewWoundReport = Omit<WoundReport, 'id' | 'createdAt'>;

export enum UserRole {
  ADMIN = 'ADMIN',
  NURSE = 'NURSE',
  VIEWER = 'VIEWER'
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  NEW_REPORT = 'NEW_REPORT',
  HISTORY = 'HISTORY',
  AI_ASSISTANT = 'AI_ASSISTANT'
}
