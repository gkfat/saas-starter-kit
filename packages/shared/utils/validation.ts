const USERNAME_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{6,20}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9]{6,8}$/;
const PHONE_REGEX = /^0?9\d{8}$/;
const SYNTHETIC_EMAIL_SUFFIX = '@internal.local';

export const isValidUsername = (value: string) => USERNAME_REGEX.test(value);
export const isValidPassword = (value: string) => PASSWORD_REGEX.test(value);
export const isValidPhone = (value: string) => PHONE_REGEX.test(value);
export const toSyntheticEmail = (username: string) => `${username}${SYNTHETIC_EMAIL_SUFFIX}`;
export const isSyntheticEmail = (email: string) => email.endsWith(SYNTHETIC_EMAIL_SUFFIX);
