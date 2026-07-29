import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "./constants.ts";

export const passwordUtils = {
  hash: (plainText: string): Promise<string> =>
    bcrypt.hash(plainText, BCRYPT_COST),

  compare: (plainText: string, hash: string): Promise<boolean> =>
    bcrypt.compare(plainText, hash),
};
