import { PartyType } from '@bizmanage/types';

export function getPartyBalanceDisplay(balance: number, partyType: PartyType | string): string {
  const numBalance = Number(balance) || 0;
  if (numBalance === 0) return 'Settled';

  if (partyType === 'CUSTOMER') {
    if (numBalance > 0) {
      return `Rs. ${numBalance.toLocaleString()} To Receive`;
    } else {
      return `Rs. ${Math.abs(numBalance).toLocaleString()} Advance`;
    }
  } else if (partyType === 'SUPPLIER') {
    if (numBalance < 0) {
      return `Rs. ${Math.abs(numBalance).toLocaleString()} To Pay`;
    } else {
      return `Rs. ${numBalance.toLocaleString()} Advance`;
    }
  } else {
    // Both
    if (numBalance > 0) {
      return `Rs. ${numBalance.toLocaleString()} To Receive`;
    } else {
      return `Rs. ${Math.abs(numBalance).toLocaleString()} To Pay`;
    }
  }
}

export function formatPartyBalance(balance: number, partyType: PartyType | string): { text: string, colorClass: string } {
  const numBalance = Number(balance) || 0;
  if (numBalance === 0) return { text: 'Settled', colorClass: 'text-slate-400' };

  if (partyType === 'CUSTOMER') {
    if (numBalance > 0) {
      return { text: `Rs. ${numBalance.toLocaleString()} To Receive`, colorClass: 'text-rose-400' };
    } else {
      return { text: `Rs. ${Math.abs(numBalance).toLocaleString()} Advance`, colorClass: 'text-emerald-400' };
    }
  } else if (partyType === 'SUPPLIER') {
    if (numBalance < 0) {
      return { text: `Rs. ${Math.abs(numBalance).toLocaleString()} To Pay`, colorClass: 'text-rose-400' };
    } else {
      return { text: `Rs. ${numBalance.toLocaleString()} Advance`, colorClass: 'text-emerald-400' };
    }
  } else {
    // Both
    if (numBalance > 0) {
      return { text: `Rs. ${numBalance.toLocaleString()} To Receive`, colorClass: 'text-emerald-400' };
    } else {
      return { text: `Rs. ${Math.abs(numBalance).toLocaleString()} To Pay`, colorClass: 'text-rose-400' };
    }
  }
}
