import bcrypt from "bcryptjs";

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

export function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}
