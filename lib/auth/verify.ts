// Email verification disabled. Expose no-op stubs to keep backward imports working.
export function createToken(): string {
  return '';
}

export async function createVerificationToken(_userId: number) {
  return '';
}

export async function verifyEmailByToken(_token: string) {
  return false;
}

export function createSixDigitCode() {
  return '000000';
}

export async function createVerificationCode(_userId: number) {
  return '000000';
}

export async function verifyEmailByCode(_userId: number, _code: string) {
  return false;
}
