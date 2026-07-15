const USERNAME_REGEX = /^[a-zA-Z0-9]{6,8}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9]{6,8}$/;

export const isValidUsername = (value: string) => USERNAME_REGEX.test(value);
export const isValidPassword = (value: string) => PASSWORD_REGEX.test(value);
export const toSyntheticEmail = (username: string) => `${username}@internal.local`;
